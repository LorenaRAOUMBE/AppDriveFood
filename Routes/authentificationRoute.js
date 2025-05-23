require('dotenv').config();
const express = require("express");
const pool = require("../config.bd/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// --- Middleware pour protéger les routes (authentification requise) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Pas de jeton, non autorisé
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erreur de vérification du jeton JWT:", err);
            return res.sendStatus(403); // Jeton invalide ou expiré
        }
        req.user = user;
        next();
    });
};

// --- Fonction d'inscription ---

router.post("/inscription", async (req, res) => {
    const { nom, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        pool.query('INSERT INTO utilisateurs (nom, email, password, role) VALUES (?, ?, ?, ?)',
            [nom, email, hashedPassword, role], (err, result) => {
                if (err) {
                    console.error("Erreur lors de l'inscription:", err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: "L'email est déjà utilisé." });
                    }
                    return res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
                }
                res.status(201).json({ message: "Inscription réussie", userId: result.insertId });
            });
    } catch (hashError) {
        console.error("Erreur lors du hachage du mot de passe:", hashError);
        res.status(500).json({ message: "Une erreur interne est survenue." });
    }
});


// --- Fonction de connexion ---
router.post("/connexion", async (req, res) => {
    const { email, password } = req.body;

    pool.query("SELECT idUtilisateur, email, password FROM utilisateurs WHERE email = ?", [email], async (err, result) => {
        if (err) {
            console.error("Erreur lors de la recherche de l'utilisateur:", err);
            return res.status(500).json({ message: "Une erreur interne est survenue." });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }

        // AUTHENTIFICATION À DEUX ÉTAPES : ÉTAPE 1 (Génération et envoi de l'OTP)
       
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

        pool.query('UPDATE utilisateurs SET otp = ?, otp_expires_at = ? WHERE idUtilisateur = ?',
            [otpCode, new Date(Date.now() + 5 * 60 * 1000), user.idUtilisateur], 
            (updateErr) => {
                if (updateErr) {
                    console.error("Erreur lors de la mise à jour de l'OTP:", updateErr);
                    return res.status(500).json({ message: "Une erreur est survenue lors de la génération de l'OTP." });
                }
                console.log(`OTP généré pour l'utilisateur ${user.email}: ${otpCode}`);

                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Votre Code de Vérification OTP',
                    html: `<p>Votre code OTP est : <strong>${otpCode}</strong></p><p>Ce code est valide pendant 5 minutes.</p>`
                }).catch(mailErr => console.error("Erreur d'envoi d'email OTP:", mailErr));

                res.json({
                    message: "Authentification réussie. Un code OTP a été envoyé à votre e-mail. Veuillez le saisir pour finaliser la connexion.",
                    requiresOtpVerification: true,
                    email: user.email
                });
            });
    });
});

// --- Route pour la vérification OTP (Deuxième étape de l'authentification) ---
router.post('/verify-otp', async (req, res) => {
    const { email, enteredOtp } = req.body;

    pool.query('SELECT idUtilisateur, nom, email, role, verifie, otp, otp_expires_at FROM utilisateurs WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error("Erreur lors de la recherche de l'utilisateur pour l'OTP:", err);
            return res.status(500).json({ message: "Une erreur interne est survenue." });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        const user = result[0];

        // Vérifier si un OTP a été généré et s'il correspond
        if (!user.otp || user.otp !== enteredOtp) {
            return res.status(401).json({ message: 'Code OTP incorrect.' });
        }

        // Vérifier l'expiration de l'OTP
        const otpExpiresAt = new Date(user.otp_expires_at);
        if (Date.now() > otpExpiresAt.getTime()) {
            // Optionnel: Effacer l'OTP expiré de la base de données
            pool.query('UPDATE utilisateurs SET otp = NULL, otp_expires_at = NULL WHERE idUtilisateur = ?', [user.idUtilisateur], (clearErr) => {
                if (clearErr) console.error("Erreur lors de l'effacement de l'OTP expiré:", clearErr);
            });
            return res.status(401).json({ message: 'Code OTP expiré. Veuillez vous reconnecter pour en générer un nouveau.' });
        }

        // OTP vérifié : Effacer l'OTP de la base de données pour qu'il ne puisse pas être réutilisé
        pool.query('UPDATE utilisateurs SET OPT = NULL, otp_expires_at = NULL WHERE idUtilisateur = ?', [user.idUtilisateur], (clearErr) => {
            if (clearErr) console.error("Erreur lors de l'effacement de l'OTP après vérification:", clearErr);
        });

        // Générer le jeton JWT une fois que l'OTP est vérifié
        const token = jwt.sign(
            { id: user.idUtilisateur, email: user.email, role: user.role, verified: user.verifie },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(200).json({ message: "Authentification 2FA réussie!", token: token, role: user.role });
    });
});


// --- Route pour la vérification de l'e-mail (après clic sur un lien de vérification) ---
router.post('/verify-email', authenticateToken, async (req, res) => {
    const userId = req.user.idUtilisateur;

    // Vérifier si l'utilisateur est déjà vérifié avant de tenter la mise à jour
    pool.query('SELECT verifie FROM utilisateurs WHERE idUtilisateur = ?', [userId], (err, result) => {
        if (err) {
            console.error("Erreur lors de la vérification du statut email:", err);
            return res.status(500).json({ message: "Une erreur interne est survenue." });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }
        if (result[0].verifie) {
            return res.status(400).json({ message: 'Votre compte est déjà vérifié.' });
        }

        pool.query('UPDATE utilisateurs SET verifie = TRUE WHERE idUtilisateur = ?', [userId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error("Erreur lors de la mise à jour de la vérification de l'email:", updateErr);
                return res.status(500).json({ message: "Une erreur est survenue lors de la vérification de l'email." });
            }
            res.json({ message: 'Votre adresse e-mail a été vérifiée avec succès!' });
        });
    });
});

module.exports = router;