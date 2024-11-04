$(document).ready(function(){
    $('#registrationForm').on('submit', function(e){
        e.preventDefault();

        // Eingabewerte holen
        let username = $('#username').val().trim();
        let email = $('#email').val().trim();
        let password = $('#password').val().trim();

        // Validierung
        if(username === "" || email === "" || password === "") {
            alert("Bitte alle Felder ausfüllen.");
            return;
        }

        // Datenobjekt erstellen
        let userData = {
            username: username,
            email: email,
            password: password
        };

        // Daten an den Server senden
        $.ajax({
            url: '/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(userData),
            success: function(response) {
                console.log('Serverantwort:', response);
                alert(response.message);
                $('#registrationForm')[0].reset();
            },
            error: function(xhr) {
                console.error('Fehler beim Senden der Daten:', xhr.responseText);
                if(xhr.responseJSON && xhr.responseJSON.message) {
                    alert(xhr.responseJSON.message);
                } else {
                    alert('Es gab ein Problem bei der Registrierung.');
                }
            }
        });
    });
});
