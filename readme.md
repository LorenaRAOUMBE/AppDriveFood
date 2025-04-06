# APPLICATION WEB DRIVEFOOD

DriveFood est une application web permettant aux utilisateurs de commander des repas en ligne à partir de divers restaurants partenaires. Elle inclut des fonctionnalités de gestion des administrateurs, des commandes, des restaurants, des livraisons, et plus encore. Le système facilite la gestion de la livraison, des plats et des clients dans un environnement simplifié.

# Table des matières

* Technologies utilisées
* Installation
* Utilisation
* Routes API
* Test

## Technologies utilisées :

* Backend : Node.js, Express
* Base de données : MySQL
* Frontend : EJS pour les vues HTML

## Installation

Pour installer et configurer le projet, suivez ces étapes :

**Prérequis**

* Node.js
* npm
* MySQL : Assurez-vous que MySQL est installé et que vous avez une base de données configurée pour l'application.

**Creer un dossier au projet**

* `mkdir AppDriveFood`
* `cd AppDriveFood`

**Clonez le dépôt du projet :**

`git clone https://github.com/LorenaRAOUMBE/AppDriveFood.git`

**Installez les dépendances du projet :**

`npm install`

Créez une base de données **phpmyadmin** et configurez-la pour correspondre au modèle de données utilisé dans l'application.

Modifiez les configurations de la base de données dans `config.bd/db.js` si nécessaire.

**Démarrez le serveur :**

Le serveur sera accessible à l'adresse `http://localhost:3400`.

## Utilisation

Une fois l'application installée et configurée, voici comment utiliser les fonctionnalités principales :

* Connexion en tant qu'administrateur : Accédez à l'interface d'administration en vous connectant avec les identifiants de l'administrateur.
* Gérer les restaurants : Ajoutez, modifiez ou supprimez des restaurants dans le système.
* Ajouter des plats : Chaque restaurant peut ajouter ou modifier des plats dans son menu.
* Gérer les commandes : En tant qu'administrateur, vous pouvez visualiser, modifier ou supprimer les commandes passées par les clients.

## Routes API

Voici un aperçu des principales routes de l'API pour interagir avec les ressources de l'application.

### Administrateurs

* **GET : http://localhost:3400/administrateur**
    * **Description**: Récupère tous les administrateurs.
    * **Réponse** :
        * 200 OK : Liste des administrateurs.
* **GET /administrateur/:id**
    * Exemple : http://localhost:3400/administrateur/1
    * **Description** : Récupère un administrateur spécifique par son ID.
    * **Paramètres**: id (ID de l'administrateur).
* **POST http://localhost:3400/administrateur**:
    * **Description**: Crée un nouvel administrateur.
    * **Corps de la requête**: nom, prenom, email.
    * Exemple :
        * `{"nom":"Raoumbe", "prenom":"john", "email": "j@gmail.com"}`
* **PUT /administrateur/:id** : http://localhost:3400/administrateur/id
    * **Description** : Met à jour les informations d'un administrateur par son ID.
    * **Corps de la requête** : nom, prenom, email.
* **DELETE /administrateur/:id**
    * **Description**: Supprime un administrateur par son ID.

### Restaurants

* **GET /restaurant** : http://localhost:3400/restaurant
    * **Description**: Récupère tous les restaurants.
    * **Réponse** : Liste des restaurants.
* **POST /restaurant** : http://localhost:3400/restaurant
    * **Description**: Crée un nouveau restaurant.
    * **Corps de la requête** : idCategorie, nom, adresse.
* **PUT /restaurant/:id** :
    * **Exemple**: http://localhost:3400/restaurant/
    * **Description** : Met à jour les informations d'un restaurant.
    * **Corps de la requête** : idCategorie, nom, adresse ,idRestaurant.
* **DELETE /restaurant/:id**
    * **Exemple**: DELETE http://localhost:3400/restaurant/3
    * **Description** : Supprime un restaurant par son ID.

### Plats

* #### **GET http://localhost:3400/plat**
    * **Description** : Récupère tous les plats.
    * **Réponse**: Liste des plats disponibles.
* **POST http://localhost:3400/plat**
    * **Description** : Crée un nouveau plat dans un restaurant.
    * **Corps de la requête** :
        * `{"nom": "Nom du plat", "prix": 12.000 f, "details": "Description détaillée du plat", "idPlat": "Identifiant unique du plat"}`
    * **Réponses** :
        * **201 Créé** : "Plat ajouté avec succès".
        * **400 Mauvaise requête** : La requête est mal formée ou les données sont invalides.
        * **500 Erreur interne du serveur** : Une erreur s'est produite sur le serveur.
* **PUT /plat/:idPlat** :
    * **Exemple :** http://localhost:3400/plat:2
    * **Description** : Met à jour un plat existant dans un restaurant.
    * **Corps de la requête** : JSON
        * `{"nom": "Nouveau nom du plat", "prix": 13 000 , "details": "Nouvelle description détaillée du plat"}`
    * **Réponses** :
        * **200 OK** : Plat mis à jour avec succès.
* **DELETE http://localhost:3400/plat/idPlat**
    * **Description** : Supprime un plat existant d'un restaurant.
    * **Réponses** : Plat supprimée avec succès

### Routes de Commande (CRUD)

1.  Lire toutes les commandes (GET /commande)
    * **Description :** Récupère la liste de toutes les commandes.
    * **Méthode HTTP :** GET
    * **URL :http://localhost:3400/commande**
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un tableau d'objets commande.
        * Exemple de réponse :
            * `{"idCommande": 1, "idClient": 123, "idPlat": "pizza-margherita-123", "statut": "en cours", "modeDePaiement": "carte", "date_com": "2024-10-27T10:00:00.000Z"}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
2.  Lire une commande spécifique (GET /commande/:idCommande)
    * **Description :** Récupère une commande par son ID.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/commande/idCommande
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet commande.
        * Exemple de réponse :
            * `{"idCommande": 1, "idClient": 123, "idPlat": "pizza-margherita-123", "statut": "en cours", "modeDePaiement": "carte", "date_com": "2024-10-27T10:00:00.000Z"}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
3.  Créer une commande (POST /commande)
    * **Description :** Crée une nouvelle commande.
    * **Méthode HTTP :** POST
    * **URL :** http://localhost:3400/commande
    * **Corps de la requête (application/json) :**
        * `{"idClient": 123, "idPlat": "pizza-margherita-123", "statut": "en cours", "modeDePaiement": "carte", "date_com": "2024-10-27T10:00:00.000Z"}`
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un message de confirmation et l'ID de la commande créée.
        * Exemple de réponse :
            * `{"message": "Commande créée avec succès !", "commandeId": 1}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
4.  Modifier une commande (PUT /commande/idCommande)
    * **Description :** Met à jour une commande existante.
    * **Méthode HTTP :** PUT
    * **URL :** http://localhost:3400/commande/idCommande
    * **Corps de la requête (application/json) :**
        * `{"idClient": 456, "idPlat": "salade-cesar-456", "statut": "terminée", "modeDePaiement": "espèces", "date_com": "2024-10-27T11:30:00.000Z"}`
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un message de confirmation.
        * Exemple de réponse :
            * `{"message": "Commande modifiée avec succès"}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
5.  Supprimer une commande (DELETE /commande/{idCommande})
    * **Description :** Supprime une commande existante.
    * **Méthode HTTP :** DELETE
    * **URL :** http://localhost:3400/commande/idCommande
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un message de confirmation.
        * Exemple de réponse :
            * `{"message": "Commande supprimée avec succès"}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.

### Routes de categorie (CRUD)

1.  Afficher toutes les catégories (GET /categorie)
    * **Description :** Récupère la liste de toutes les catégories.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/categorie
    * **Paramètres :** Aucun
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un tableau de catégories.
        * Exemple de réponse :
            * `{"categories": [{"idCategorie": 1, "categorie": "Entrées"}, {"idCategorie": 2, "categorie": "Plats principaux"}, {"idCategorie": 3, "categorie": "Desserts"}]}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur et les détails de l'erreur.
            * `{"error": "Erreur serveur", "details": "Message d'erreur détaillé"}`
2.  Afficher une catégorie spécifique (GET /categorie/{idCategorie})
    * **Description :** Récupère une catégorie par son ID.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/categorie/idCategorie
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON représentant la catégorie.
        * Exemple de réponse :
            * `{"idCategorie": 1, "categorie": "Entrées"}`
    * **Gestion des erreurs :**
        * Code de statut : 404 Catégorie non trouvée.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur.
            * `{"error": "Catégorie non trouvée"}`
        * Code de statut : 500 Erreur interne du serveur.
3.  Ajouter une catégorie (POST /categorie)
    * **Description :** Crée une nouvelle catégorie.
    * **Méthode HTTP :** POST
    * **URL :** http://localhost:3400/categorie
    * **Corps de la requête (application/json) :**
        * `{"categorie": "Nouvelle catégorie"}`
    * **Réponse :**
        * Code de statut : 201 Créé
        * Corps de la réponse : Un objet JSON contenant un message de confirmation et l'ID de la catégorie créée.
        * Exemple de réponse :
            * `{"message": "Catégorie créée", "id": 4}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
4.  Modifier une catégorie (PUT /categorie/idCategorie)
    * **Description :** Met à jour une catégorie existante.
    * **Méthode HTTP :** PUT
    * **URL :** http://localhost:3400/categorie/idCategorie
    * **Corps de la requête (application/json) :**
        * `{"categorie": "Nouveau nom de catégorie"}`
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Exemple de réponse :
            * `{"message": "Catégorie mise à jour"}`
    * **Gestion des erreurs :**
        * Code de statut : 404 Catégorie non trouvée.
        * Code de statut : 500 Erreur interne du serveur.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur et les détails de l'erreur.
5.  Supprimer une catégorie (DELETE /categorie/{idCategorie})
    * **Description :** Supprime une catégorie existante.
    * **Méthode HTTP :** DELETE
    * **URL :** http://localhost:3400/categorie/idCategorie
    * **Paramètres de l'URL :**
        * `{idCategorie}` (nombre, obligatoire) : L'ID de la catégorie à supprimer.
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Exemple de réponse :
            * `{"message": "Catégorie supprimée"}`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur et les détails de l'erreur.

### Routes de Clients (CRUD)

1.  Afficher tous les clients (GET /client)
    * **Description :** Récupère la liste de tous les clients.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/client
    * **Paramètres :** Aucun
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un tableau de clients.
        * Exemple de réponse :
            * `{ { "idClient": 1, "nom": "MOUSSANDJI", "prenom": "Jean", "numeroDeTel": "0623456789" } }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
2.  Afficher un client spécifique (GET /client/idClient)
    * **Description :** Récupère un client par son ID.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/client/idClient
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON représentant le client.
        * Exemple de réponse :
            * `{ "idClient": 1, "nom": "MOUSSANDJI", "prenom": "Jean", "numeroDeTel": "0623456789" }`
    * **Gestion des erreurs :**
        * Code de statut : 404 Client non trouvé.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur.
            * `{"error": "Client non trouvé"}`
        * Code de statut : 500 Erreur interne du serveur.
3.  Ajouter un client (POST /client)
    * **Description :** Crée un nouveau client.
    * **Méthode HTTP :** POST
    * **URL :** http://localhost:3400/client
    * **Corps de la requête (application/json) :**
        * `{ "nom": "KOUMBA","prenom": "Pierre", "numeroDeTel": "0612345678" }`
    * **Réponse :**
        * Code de statut : 201 Créé
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
        * Corps de la réponse : Un objet JSON contenant un message d'erreur et les détails de l'erreur.
4.  Modifier un client (PUT /client/idClient)
    * **Description :** Met à jour un client existant.
    * **Méthode HTTP :** PUT
    * **URL :** http://localhost:3400/client/idClient
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
5.  Supprimer un client (DELETE /client/{idClient})
    * **Description :** Supprime un client existant.
    * **Méthode HTTP :** DELETE
    * **URL :** http://localhost:3400/client/idClient
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Code de statut : 500 Erreur interne du serveur.

### Routes de Livreurs (CRUD)

1.  Afficher tous les livreurs (GET /livreur)
    * **Description :** Récupère la liste de tous les livreurs.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/livreur
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un tableau de livreurs.
        * Exemple de réponse :
            * `{ { "idLivreur": 1, "nom": "Durand", "prenom": "Pierre", "statut": "Disponible", "typeDeVehicule": "Scooter", "numeroDeTel": "0612345678" } }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
2.  Afficher un livreur spécifique (GET /livreur/{idLivreur})
    * **Description :** Récupère un livreur par son ID.
    * **Méthode HTTP :** GET
    * **URL :** http://localhost:3400/livreur/idLivreur
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON représentant le livreur.
        * Exemple de réponse :
            * `{ "livreur": { "idLivreur": 1, "nom": "ENOMBO", "prenom": "Pierre", "statut": "Disponible", "typeDeVehicule": "Scooter", "numeroDeTel": "0612345678" } }`
3.  Créer un livreur (POST /livreur)
    * **Description** : Crée un nouveau livreur.
    * **Méthode HTTP** : POST
    * **URL**: http://localhost:3400/livreur
    * **Corps de la requête (application/json) :**
        * `{ "idLivreur": 1, "nom": "ENOMBO", "prenom": "Pierre", "statut": "Disponible", "typeDeVehicule": "Scooter", "numeroDeTel": "0612345678" }`
    * Réponse :
        * **Code de statut** : 201 Créé
        * **Corps de la réponse**: Un objet JSON contenant un message de confirmation et l'ID du livreur créé.
        * **Exemple de réponse** :
            * `{ "message": "Livreur créé avec succès", "idLivreur": 3 }`
4.  Mettre à jour un livreur (PUT /livreur/{idLivreur})
    * **Description** : Met à jour un livreur existant.
    * **Méthode HTTP** : PUT
    * **URL** : http://localhost:3400/livreur/idLivreur
    * **Corps de la requête (application/json) :**
        * `{ "nom": "MOUSSOUNDA", "prenom": "Pierrette", "statut": "En livraison", "typeDeVehicule": "Voiture", "numeroDeTel": "0789012345" }`
    * **Réponse** :
        * **Code de statut** : 200 OK
        * **Corps de la réponse** : Un objet JSON contenant un message de confirmation.
        * **Exemple de réponse** :
            * `{ "message": "Livreur modifié avec succès" }`
    * **Gestion des erreurs**:
        * **Code de statut :** 500 Erreur interne du serveur.
5.  Supprimer un livreur (DELETE /livreur/{idLivreur})
    * **Description** : Supprime un livreur existant.
    * **Méthode HTTP** : DELETE
    * **URL** : http://localhost:3400/livreur/idLivreur
    * **Réponse** :
        * **Code de statut** : 200 OK
        * **Corps de la réponse**: Un objet JSON contenant un message de confirmation.
        * **Exemple de réponse** :
            * `{ "message": "Livreur supprimé avec succès" }`
    * **Gestion des erreurs** :
        * **Code de statut** : 500 Erreur interne du serveur.

### Routes de Gestion des Livraisons (CRUD)

1.  Afficher toutes les livraisons (GET /livraison)
    * **Description :** Récupère la liste de toutes les livraisons.
    * **Méthode HTTP :** GET
    * **URL :** ttp://localhost:3400/livraison
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un tableau de livraisons.
        * Exemple de réponse :
            * `{ "idLivraison": 1, "idCommande": 1, "idLivreur": 1, "adresseLiv": "Tobia", "statut": "En cours" }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
2.  Afficher une livraison spécifique (GET /livraison/{idLivraison})
    * **Description :** Récupère une livraison par son ID.
    * **Méthode HTTP :** GET
    * **URL :** ttp://localhost:3400/livraison/{idLivraison}
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON représentant la livraison.
        * Exemple de réponse :
            * `{ "idLivraison": 1, "idCommande": 1, "idLivreur": 1, "adresseLiv": "123 Rue de la Livraison", "statut": "En cours" }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
3.  Créer une livraison (POST /livraison)
    * **Description :** Crée une nouvelle livraison.
    * **Méthode HTTP :** POST
    * **URL :** ttp://localhost:3400/livraison
    * **Corps de la requête (application/json) :**
        * `{ "idCommande": 3, "idLivreur": 3, "adresseLiv": "Bd Aeroport", "statut": "Planifiée" }`
    * **Réponse :**
        * Code de statut : 201 Créé
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Exemple de réponse :
            * `{ "message": "Livraison créée avec succès" }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
4.  Modifier une livraison (PUT /livraison/{idLivraison})
    * **Description :** Met à jour une livraison existante.
    * **Méthode HTTP :** PUT
    * **URL :** http://localhost:3400/livraison/{idLivraison}
    * **Corps de la requête (application/json) :**
        * `{ "idCommande": 4, "idLivreur": 4, "adresseLiv": "Ombooue Central", "statut": "En transit" }`
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Exemple de réponse :
            * `{ "message": "Livraison mise à jour avec succès" }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.
5.  Supprimer une livraison (DELETE /livraison/{idLivraison})
    * **Description :** Supprime une livraison existante.
    * **Méthode HTTP :** DELETE
    * **URL :** ttp://localhost:3400/livraison/{idLivraison}
    * **Réponse :**
        * Code de statut : 200 OK
        * Corps de la réponse : Un objet JSON contenant un message de confirmation.
        * Exemple de réponse :
            * `{ "message": "Catégorie supprimée" }`
    * **Gestion des erreurs :**
        * Code de statut : 500 Erreur interne du serveur.

## Tests

Vous pouvez tester les differentes routes avec un navigateur web ou Postman.