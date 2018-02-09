/* TweetStats
 *
 * Fichier       ./front/classes/search.js
 * Description   Classe principale pour effectuer une recherche dans les tweets ainsi que la fonction de recherche
 * Auteurs       Théophile Walter
 */

 class Search {

    /*
     * Constructeur de la classe Search
     * 
     * @params
     *   string: la chaîne de caractères correspondant aux termes à rechercher dans la base
     *   parent: l'élement DOM dans lequel ajouter le résultat HTML de la requête
     * 
     * @notes
     *   La requête peut être longue à s'effectuer, le résultat est affiché à la réponse
     */
    constructor(string, parent) {

        // Définition des attributs
        this.string      = string;
        this.parent      = parent;
        this.element     = null; // L'élement DOM dans lequel mettre le rapport
        this.content     = null; // Le sous élement DOM dans lequel afficher le contenu
        this.delete      = null; // Bouton de suppression
        this.words       = string.split(/[\s,.;:!?]/g);
        this.url         = "/api/search/" + string;
        this.responseUrl = "/api/get-response/";
        this.requestId   = null; // L'identifiant de la requête (pour attendre la réponse)
        this.interval    = null; // L'intervalle d'attente (setInterval)

        // Vérifie si la recherche a du contenu
        if (util.arrayAllEmpty(this.words)) {
            alert("Erreur : Votre recherche est vide !");
            this.remove(true);
            return;
        }

        // Variable contenant l'environnement local pouvant être utilisée dans les méthodes asynchrones
        let searchThis = this;

        // Si cette recherche est la première affiché, on supprime le message
        if (util.objectIsEmpty(searchList)) {
            document.getElementById("results-feed").innerHTML = '';
        }

        // Crée le conteneur
        this.element = document.createElement("div");
        this.element.className = "search-result";
        
        // Y ajoute les termes de la recherche (cliquer dessus pour rechercher)
        this.element.innerHTML += "<div class=\"search-title\">Termes de la recherche</div>";
        for (var i = 0; i < this.words.length; i++) {
            if (this.words[i] !== "") {
                this.element.innerHTML += "<span class=\"search-word\" onclick=\"javascript:searchTweet(util.decodeHtml(this.innerHTML));\">" + util.escapeHtml(this.words[i]) + "</span>"; 
            }
        }

        // Et affiche un message
        this.element.innerHTML += "<br /><br />";
        this.content = document.createElement("div");
        this.content.innerHTML = "Envoi de la requête au serveur....";
        this.element.appendChild(this.content);

        // Bouton de suppression
        this.delete = document.createElement("div");
        this.delete.className = "delete-search";
        var deleteButton = document.createElement("span");
        deleteButton.onclick = function() {
            // Doit être appelé de cette façon pour que le "this" de la fonction ne soit pas celui de l'objet DOM cliqué
            searchThis.remove();
        }
        deleteButton.innerHTML = "supprimer";
        this.delete.appendChild(deleteButton);
        this.element.appendChild(this.delete);

        // Ajoute le conteneur au parent
        if (this.parent.childNodes.length > 0) {
            this.parent.insertBefore(this.element, this.parent.childNodes[0]);
        } else {
            this.parent.appendChild(this.element);
        }

        // Envoi la requête
        var xhr = new XMLHttpRequest();
        xhr.open("GET", this.url, true);

        // Fonction d'attente de la réponse
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {

                    // Par défaut la réponse correspond à l'ID de la requête
                    // On enregistre cette nouvelle requête

                    var resp = JSON.parse(xhr.responseText);

                    // L'identifiant est un hash md5 en hexadécimal, il a donc une longueur de 32 caractères
                    if (resp.status === '1' && resp.id.length == 32) {
                        // Met à jour la page et les cookies si besoin
                        searchList[resp.id] = searchThis;
                        var list = util.getCookie("tweetstats_list");
                        if (list === undefined || list.indexOf(resp.id + "-") === -1) {
                            util.setCookie("tweetstats_search_" + resp.id, searchThis.string, 30); // Le résultat est oublié après 30 jours
                            util.setCookie("tweetstats_list", (list === undefined ? "" : list) + resp.id + "-", 30);
                        }
                        // Change le message
                        searchThis.content.innerHTML = "Le serveur effectue la recherche....<br />Cela peut prendre plusieur minutes.";

                        // Enregistre l'identifiant
                        searchThis.requestId = resp.id;

                        // Crée l'interval d'attente de la réponse
                        // Demande au serveur toutes les secondes si la réponse est prête
                        searchThis.interval = setInterval(
                            function() {
                                var xhr2 = new XMLHttpRequest();
                                xhr2.open("GET", searchThis.responseUrl + searchThis.requestId, true);
                                xhr2.onload = function (e) {
                                    if (xhr2.readyState === 4) {
                                        if (xhr2.status === 200) {
                                            // On supprime l'interval
                                            clearInterval(searchThis.interval);
                                            searchThis.interval = null;
                                            // Récupère la réponse
                                            var resp2 = JSON.parse(xhr2.responseText);
                                            if (resp2.status === '1') {
                                                // Affiche le résultat
                                                searchThis.display(resp);
                                            } else {
                                                searchThis.error("API error: " + resp2.error);
                                            }
                                        } else {
                                            searchThis.error("Erreur du serveur !");
                                            // On supprime l'interval
                                            clearInterval(searchThis.interval);
                                            searchThis.interval = null;
                                        }
                                    }
                                };
                                xhr2.onerror = function (e) {
                                    searchThis.error("Erreur inconnue !");
                                    // On supprime l'interval
                                    clearInterval(searchThis.interval);
                                    searchThis.interval = null;
                                };
                                xhr2.send(null);
                            },
                            1000
                        );

                    } else {
                        searchThis.error("API error: " + resp.error);
                    }


                } else {
                    searchThis.error("Erreur du serveur !");
                }
            }
        };

        // En cas d'erreur
        xhr.onerror = function (e) {
            searchThis.error("Erreur inconnue !");
        };

        // Envoi la requête
        xhr.send(null);

    }

    /*
     * Affiche le résultat d'une recherche
     * 
     * @params
     *   result: L'objet JSON tel que retourné par l'API TweetStats
     */
    display(object) {
        // TODO: Implémenter l'affichage
        this.content.innerHTML = "<div class=\"search-title\">Résultat brut</div>";
        var jse = new JsonExplorer(this.content);
        jse.draw(object);
    }

    /*
     * Supprime la recherche de la page
     * 
     * @params
     *   skipConfirmation: Un booléen indiquant si il faut sauter la demande de confirmation (facultatif, false par défaut)
     * 
     * @notes
     *   Supprime la recherche du contenu HTML, des variables JavaScript et des cookies
     *   Cette action est irréversible !
     *   L'utilisation de l'instance de classe associée est fortement déconseillée après l'appel à cette méthode
     */
    remove(skipConfirmation) {
            
        // Confirmation
        if (skipConfirmation !== true && !confirm("Voulez-vous vraiment supprimer cette recherche ?\nCette action est irréversible.")) {
            return;
        }

        // Suppression de la recherche
        if (this.interval !== null) {
            clearInterval(this.interval);
        }
        delete searchList[this.requestId];
        if (this.element !== null) {
            this.element.remove();
        }

        // Tente de récupére l'identifiant si il n'existe pas
        if (this.requestId === null) {
            this.requestId = util.md5(this.string);
        }

        if (util.getCookie("tweetstats_search_" + this.requestId) !== undefined) {
            util.setCookie("tweetstats_search_" + this.requestId, '', -1);
        }
        var list = util.getCookie("tweetstats_list");
        if (list !== undefined) {
            util.setCookie("tweetstats_list", list.replace(this.requestId + "-", ""), 30);
        }

        // Vérifie si il faut afficher un message si il ne reste plus de recherches
        if (util.objectIsEmpty(searchList)) {
            document.getElementById("results-feed").innerHTML = "Vous n'avez pas de recherches pour le moment \uD83D\uDE41";
        }

    }

    /*
     * Affiche une erreur dans le résultat
     * 
     * @params
     *   string: le message d'erreur à afficher
     */
    error(string) {
        this.content.innerHTML = "<span class=\"error\">" + util.escapeHtml(string) + "</span>";  
    }

}

/*
 * Effectue une recherche dans les tweets
 * 
 * @params
 *   string: La chaîne de caractères à rechercher (facultatif)
 * 
 * @notes
 *   Récupère les informations dans la page HTML
 */
function searchTweet(string) {
    var searchInput = document.getElementById('search-input');
    if (string === undefined) {
        string = searchInput.value;
        searchInput.value = '';
    }
    // Vérifie que la recherche n'existe pas déjà
    if (!searchExists(string)) {
        new Search(string, document.getElementById('results-feed'));
    }
}