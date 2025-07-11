require('dotenv').config();
const express = require("express");
const pool = require("../config.bd/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Configuration du transporteur Nodemailer pour l'envoi d'e-mails
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware pour protéger la route (authentification requise)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erreur de vérification du jeton JWT:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- Route pour l'inscription de l'utilisateur ---
router.post("/inscription", async (req, res) => {
    const { nom, email, password, role } = req.body;
    
      if (!nom || !email || !password || !role) {
        return res.status(400).json({ message: "Tous les champs (nom, email, password, role) sont requis." });
    }
    const SALT_ROUNDS = 10;
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insère le nouvel utilisateur dans la base de données
        const [result] = await pool.query(
            'INSERT INTO utilisateurs (nom, email, password, role) VALUES (?, ?, ?, ?)',
            [nom, email, hashedPassword, role]
        );
        const userId = result.insertId;

        // Génération et envoi de l'OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            'UPDATE utilisateurs SET OTP = ?, otp_expires_at = ? WHERE idUtilisateur = ?',
            [otpCode, otpExpiration, userId]
        );

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Votre Code de Vérification OTP',
            html: `<p>Votre code OTP est : <strong>${otpCode}</strong></p><p>Ce code est valide pendant 5 minutes.</p>`
        });

        res.status(201).json({
            message: "Inscription réussie. Un code OTP a été envoyé à votre e-mail. Veuillez le saisir pour finaliser la connexion.",
            requiresOtpVerification: true,
            email: email
        });
    } catch (err) {
        console.error("Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
    }
});

// --- Vérification OTP ---
router.post("/verifier-otp", async (req, res) => {
    const { email, otp } = req.body;
    try {
        const [results] = await pool.query("SELECT * FROM utilisateurs WHERE email = ?", [email]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        const user = results[0];
        const currentTime = new Date();

        if (String(user.OTP) === String(otp) && new Date(user.otp_expires_at) > currentTime) {
            await pool.query("UPDATE utilisateurs SET verifie = 'TRUE' WHERE idUtilisateur = ?", [user.idUtilisateur]);
            const token = jwt.sign(
                { id: user.idUtilisateur, email: user.email, role: user.role, verifie: 'TRUE' },
                JWT_SECRET,
                { expiresIn: "2h" }
            );
            res.status(200).json({
                message: "Authentification 2FA réussie!",
                IdUtilisateur: user.idUtilisateur,
                token: token,
                role: user.role
            });
        } else {
            return res.status(400).json({ message: "OTP incorrect ou expiré" });
        }
    } catch (err) {
        res.status(500).json({ message: "Erreur lors de la vérification OTP." });
    }
});

// --- Route pour la connexion de l'utilisateur ---
router.post("/connexion", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [result] = await pool.query(
            "SELECT idUtilisateur, nom, numeroDeTel, email, password, role, image, verifie FROM utilisateurs WHERE email = ?",
            [email]
        );
        if (result.length === 0) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }
        const user = result[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        // Vérification du statut
        if (user.verifie !== 'TRUE') {
            // Générer un nouvel OTP
            const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

            await pool.query(
                'UPDATE utilisateurs SET OTP = ?, otp_expires_at = ? WHERE idUtilisateur = ?',
                [otpCode, otpExpiration, user.idUtilisateur]
            );

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Vérification de votre compte - Code OTP',
                html: `<p>Votre code OTP est : <strong>${otpCode}</strong></p><p>Ce code est valide pendant 5 minutes.</p>`
            });

            return res.status(403).json({
                message: "Veuillez vérifier votre adresse e-mail avant de vous connecter."
            });
        }

        const token = jwt.sign(
            {
                id: user.idUtilisateur,
                nom: user.nom,
                numeroDeTel: user.numeroDeTel,
                email: user.email,
                role: user.role,
                verifie: user.verifie
            },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(200).json({
            message: "Connexion réussie.",
            token: token,
            userId: user.idUtilisateur,
            role: user.role,
            verified: user.verifie
        });
    } catch (err) {
        console.error("Erreur lors de la connexion :", err);
        res.status(500).json({ message: "Erreur serveur lors de la connexion." });
    }
});

module.exports = router;