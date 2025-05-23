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
//  Middleware pour protéger la route (authentification requise) 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Assurez-vous que l'en-tête existe et commence par 'Bearer '
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erreur de vérification du jeton JWT:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next(); // Passe au prochain middleware ou à la route finale
    });
};


// --- Route pour l'inscription de l'utilisateur ---

router.post("/inscription", async (req, res) => {
    const { nom, email, password, role } = req.body;
    const SALT_ROUNDS = 10; 
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insère le nouvel utilisateur dans la base de données
    pool.query('INSERT INTO utilisateurs (nom, email, password, role) VALUES (?, ?, ?, ?)',
        [nom, email, hashedPassword, role], (err, result) => {
            if (err) {
                console.error("Erreur lors de l'inscription:", err);
       
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: "L'e-mail est déjà utilisé." });
                }
            
                return res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
            }

            // Récupère l'ID du nouvel utilisateur inséré pour l'OTP
            const userId = result.insertId; 

            // AUTHENTIFICATION À DEUX ÉTAPES : ÉTAPE 1 (Génération et envoi de l'OTP)
            const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); 

            // Met à jour l'utilisateur avec l'OTP et sa date d'expiration (5 minutes)
            pool.query('UPDATE utilisateurs SET OTP = ?, otp_expires_at = ? WHERE idUtilisateur = ?',
                [otpCode, new Date(Date.now() + 5 * 60 * 1000), userId],
                (updateErr) => {
                    if (updateErr) {
                        console.error("Erreur lors de la mise à jour de l'OTP:", updateErr);
                        return res.status(500).json({ message: "Une erreur est survenue lors de la génération de l'OTP." });
                    }
                    console.log(`OTP généré pour l'utilisateur ${email}: ${otpCode}`);
                    console.log("EMAIL_USER:", process.env.EMAIL_USER);

                    // Envoie l'OTP à l'adresse e-mail de l'utilisateur
                    transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email, 
                        subject: 'Votre Code de Vérification OTP',
                        html: `<p>Votre code OTP est : <strong>${otpCode}</strong></p><p>Ce code est valide pendant 5 minutes.</p>`
                    }).catch(mailErr => console.error("Erreur d'envoi d'e-mail OTP:", mailErr));

                    // Répond au client que l'inscription est réussie et qu'une vérification OTP est nécessaire
                    res.status(201).json({ 
                        message: "Inscription réussie. Un code OTP a été envoyé à votre e-mail. Veuillez le saisir pour finaliser la connexion.",
                        requiresOtpVerification: true,
                        email: email 
                    });
                });
        });
});

// --- Route pour la vérification OTP (Deuxième étape de l'authentification) ---
router.post('/verify-otp', async (req, res) => {
    const { email, enteredOtp } = req.body;

    // Recherche l'utilisateur par e-mail pour vérifier l'OTP
    pool.query('SELECT idUtilisateur, nom, email, role, verifie, OTP, otp_expires_at FROM utilisateurs WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error("Erreur lors de la recherche de l'utilisateur pour l'OTP:", err);
            return res.status(500).json({ message: "Une erreur interne est survenue." });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        const user = result[0];

        // Vérifie l'expiration de l'OTP
        const otpExpiresAt = new Date(user.otp_expires_at);
        if (Date.now() > otpExpiresAt.getTime()) {
            // Efface l'OTP expiré de la base de données 
            pool.query('UPDATE utilisateurs SET OTP = NULL, otp_expires_at = NULL WHERE idUtilisateur = ?', [user.idUtilisateur], (clearErr) => {
                if (clearErr) console.error("Erreur lors de l'effacement de l'OTP expiré:", clearErr);
            });
            return res.status(401).json({ message: 'Code OTP expiré. Veuillez vous reconnecter pour en générer un nouveau.' });
        }

        // OTP vérifié avec succès : Efface l'OTP de la base de données pour qu'il ne puisse pas être réutilisé
        pool.query('UPDATE utilisateurs SET OTP = NULL, otp_expires_at = NULL, verifie = TRUE WHERE idUtilisateur = ?', [user.idUtilisateur], (clearErr) => {
            if (clearErr) console.error("Erreur lors de l'effacement de l'OTP après vérification:", clearErr);

            res.status(200).json({
                message: "Code OTP vérifié avec succès. Authentification réussie!",
                role: user.role,
                verified: true
            });
        });
    });
});


// // --- Route pour la vérification de l'e-mail  ---
// // Cette route est protégée, nécessitant un jeton JWT valide pour y accéder.
// router.post('/verify-email', async (req, res) => {
//     const userId = req.user.idUtilisateur; 

//     // Vérifie si l'utilisateur est déjà vérifié avant de tenter la mise à jour
//     pool.query('SELECT verifie FROM utilisateurs WHERE idUtilisateur = ?', [userId], (err, result) => {
//         if (err) {
//             console.error("Erreur lors de la vérification du statut email:", err);
//             return res.status(500).json({ message: "Une erreur interne est survenue." });
//         }
//         if (result.length === 0) {
//             return res.status(404).json({ message: "Utilisateur non trouvé." });
//         }
//         if (result[0].verifie) {
//             return res.status(400).json({ message: 'Votre compte est déjà vérifié.' });
//         }

//         // Met à jour le statut 'verifie' de l'utilisateur à TRUE
//         pool.query('UPDATE utilisateurs SET verifie = TRUE WHERE idUtilisateur = ?', [userId], (updateErr, updateResult) => {
//             if (updateErr) {
//                 console.error("Erreur lors de la mise à jour de la vérification de l'email:", updateErr);
//                 return res.status(500).json({ message: "Une erreur est survenue lors de la vérification de l'email." });
//             }
//             res.json({ message: 'Votre adresse e-mail a été vérifiée avec succès!' });
//         });
//     });
// });

// --- Route pour la connexion de l'utilisateur ---

router.post("/connexion", async (req, res) => {
    const { email, password } = req.body;

    // Recherche l'utilisateur par e-mail dans la base de données
    pool.query("SELECT idUtilisateur, nom, numeroDeTel, email,password ,role, image, verifie  FROM utilisateurs WHERE email = ?", [email], async (err, result) => {
        if (err) {
            console.error("Erreur lors de la recherche de l'utilisateur:", err);
            return res.status(500).json({ message: "Une erreur interne est survenue." });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }
        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        // Génère un jeton JWT pour l'utilisateur authentifié
        const token = jwt.sign(
            { id: user.idUtilisateur, nom :user.idUtilisateur.nom, numeroDeTel: user.numeroDeTel , email: user.email, role: user.role, verified: user.verifie },
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
        
    });
});

module.exports = router;
