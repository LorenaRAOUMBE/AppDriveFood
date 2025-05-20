const express = require("express");
const pool=require("../config.bd/db");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const router= express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Authentifications pour les administrateurs
//  Fonction d'inscription

router.post("/register/administrateur",async(req,res)=>{
  const { email, password}= req.body
  const hashedPassword = await bcrypt.hash(password, 10);

pool.query("INSERT INTO administrateur (email, password) VALUES (?, ?)", [email, hashedPassword],(err, result) => {
      if (err) return reject(err);
      res.status(201).json({ message: "Inscription réussie" });
    })
});

//  Fonction de connexion
router.post("/login/administrateur", (req,res)=>{
    const { email, password } = req.body;
    
  pool.query("SELECT * FROM administrateur WHERE email = ?",[email],async (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return reject(new Error("Email inconnu"));

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return reject(new Error("Mot de passe incorrect"));

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET,{ expiresIn: "2h" } );
        resolve({ message: "Connexion réussie", token });
      }
    );
  })


//  Authenficications pour les clients
//  Fonction d'inscription

router.post("/register/client",async(req,res)=>{
  const { email, password }= req.body
  const hashedPassword = await bcrypt.hash(password, 10);

pool.query("INSERT INTO client (email, password) VALUES (?, ?)", [email, hashedPassword],(err, result) => {
      if (err) return reject(err);
      res.status(201).json({ message: "Inscription réussie" });
    })
});

//  Fonction de connexion
router.post("/login/client", (req,res)=>{
    const { email, password } = req.body;
  pool.query("SELECT * FROM client WHERE email = ?",[email],async (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return reject(new Error("Email inconnu"));

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return reject(new Error("Mot de passe incorrect"));

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET,{ expiresIn: "2h" } );
       res.status(201).json({ message: "Connexion réussie", token });
      }
    );
  })

module.exports=router