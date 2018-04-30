/**
 * BlockScores
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the LICENSE.md file.
 *
 * @author Marcel Scherello <blockscores@scherello.de>
 * @copyright 2018 Marcel Scherello
 */

window.addEventListener('load', function () {

    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        // Use Mist/MetaMask's provider
        web3js = new Web3(web3.currentProvider);
    } else {
        console.log('No web3? You should consider trying MetaMask!')
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        web3js = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }

    // instantiate by address
    MyContract = web3.eth.contract(abiArray);
    contractInstance = MyContract.at(contract_address);
    var gameHash = window.location.href.substring(window.location.href.lastIndexOf("?") + 1).split("&")[0];
    if (gameHash != location.protocol + '//' + location.host + location.pathname) {
        document.getElementById('gameHash').value = gameHash;
        getGame();
    } else {
        document.getElementById("activeGameSection").hidden = true;
    }

})

document.addEventListener("DOMContentLoaded", function () {
});

function getGame() {

    document.getElementById("newGameSection").hidden = true;
    var gameHash = document.getElementById('gameHash').value;

    contractInstance.getGameByHash(gameHash, function (err, transactionHash) {
        console.log('Game Details: ', transactionHash);
        var result = transactionHash;

        var gameTitle = result[0];
        var gameDescrtiption = result[1];
        var numPlayers = result[2]['c'][0];
        var divPlayers = document.getElementById("gamePlayers");
        divPlayers.innerHTML = "";

        console.log(JSON.stringify(result));
        document.getElementById("gameTitle").innerText = gameTitle;
        document.getElementById("gameDescription").innerText = gameDescrtiption;

        html = '<table class="table"><thead><tr><th>Player</th>';
        html += '<th>Total Score</th>';
        html += '<th>unconfirmed plays</th>';
        html += '<th>add score</th>';
        html += '</tr></thead><tbody>';
        document.getElementById("gamePlayers").innerHTML = html;

        for (i = 0; i < numPlayers; i++) {
            contractInstance.getPlayerByGame(gameHash, i, function (err, transactionHash) {
                console.log(transactionHash);
                result = transactionHash;
                var score = result[1]['c'][0];
                var score_unconfirmed = result[2]['c'][0];
                var playerName = result[0];
                if (playerName != '') {
                    html = '<tr><td>' + playerName + '</td>';
                    html += '<td>' + score + '</td>';

                    if (score_unconfirmed != 0) {
                        html += '<td>(+' + score_unconfirmed + ')&nbsp;<i onClick="confirmGameScorePopup(\'' + playerName + '\')"class="fa fa-check-circle-o" style="cursor: pointer; color: #5cb85c;font-size: 20px;font-color: green;" aria-hidden="true" title="Confirm Play Scores"></i></td>';
                    } else {
                        html += '<td></td>';
                    }

                    html += '<td><div class="col-md-4" style="padding-left: 0"><input class="form-control" id="' + playerName + '_value" value="0"></div>';
                    html += '<div class="col-md-8" style="padding-left: 0"><button class="btn btn-default" type="button" id="' + playerName + '_button" onClick="addScore(\'' + playerName + '\');" style="min-width: 20px;"><i class="fa fa-plus-circle" aria-hidden="true"></i></button></div></td>';
                    html += '</tr>';
                    document.getElementById("gamePlayers").innerHTML += html;
                }

            });
        }
        //divPlayers.innerHTML += "</tbody></table>";
    });

};

function createGame() {
    var button = document.getElementById('createGame_button');
    button.innerHTML = 'in progress';
    button.disabled = true;
    var gameName = document.getElementById('newGameName').value;
    var gameDescription = document.getElementById('newGameDescription').value;

    var getData = contractInstance.addNewGame.getData(gameName, gameDescription);
    web3.eth.sendTransaction({
            to: contract_address,
            from: web3.eth.accounts[0],
            data: getData
        }, function (err, transactionHash) {
            if (err) return renderMessage('Oh no!: ' + err.message)
            console.log('Tx: ', transactionHash);
        }
    );
    contractInstance.createGameHash(gameName, web3.eth.accounts[0], function (err, transactionHash) {
        document.getElementById('gameHash').value = transactionHash;
        console.log('Game Hash: ', transactionHash);
    })
};

function addScore(playerName) {

    lastTx = playerName;
    var button = document.getElementById(playerName + '_button');
    button.innerHTML = 'in progress';
    button.disabled = true;

    var gameHash = document.getElementById('gameHash').value;
    var scoreValue = document.getElementById(playerName + '_value').value;

    var a = web3.personal.unlockAccount(send_acct, send_acct_pw, function (error, result) {
        if (!error) {
            var txHash = contractInstance.addGameScore(gameHash, playerName, scoreValue, {
                from: send_acct,
                gas: gas,
                gasPrice: gasPrice
            }, function (error, result) {
                txHash = result;
                console.log(txHash);
                var filter = web3.eth.filter('latest', function (error, result) {
                    if (!error) {
                        console.log(web3.eth.getTransaction(txHash).blockNumber);
                        button.innerHTML = 'sent';
                        button.disabled = false;
                        filter.stopWatching();
                        console.log(playerName + '-' + lastTx);
                        if (lastTx === playerName) getGame();
                    } else {
                        console.error(error);
                    }
                });
            });
        } else {
            console.error(error);
        }

    });

};

function confirmGameScore(playerName, confPW) {

    var button = document.getElementById(playerName + '_confButton');
    button.innerHTML = 'in progress';
    button.disabled = true;

    var gameHash = document.getElementById('gameHash').value;
    //var confPW = document.getElementById(playerName + '_confPW').value;

    web3.personal.unlockAccount(send_acct, send_acct_pw);
    var txHash = contractInstance.confirmGameScore(gameHash, playerName, confPW, {
        from: send_acct,
        gas: gas,
        gasPrice: gasPrice
    });

    console.log(txHash);
    filter = web3.eth.filter('latest', function (error, result) {

        if (!error) {

            console.log(web3.eth.getTransaction(txHash).blockNumber);

            button.innerHTML = 'sent';

            button.disabled = false;

            filter.stopWatching();

            getGame();

        } else {

            console.error(error)

        }

    });

};

function addPlayer() {

    var button = document.getElementById('addPlayer_button');
    button.innerHTML = 'in progress';
    button.disabled = true;

    var playerName = document.getElementById('playerName').value;
    var gameHash = document.getElementById('gameHash').value;

    var getData = contractInstance.addPlayerToGame.getData(gameHash, playerName);
    web3.eth.sendTransaction({
            to: contract_address,
            from: web3.eth.accounts[0],
            data: getData
        }, function (err, transactionHash) {
            if (err) return renderMessage('Oh no!: ' + err.message)
            console.log('Tx: ', transactionHash);
            document.getElementById('playerName').value = "Player Name";
            //$('#addPlayerSlider').slideUp();
        }
    );
};

function removePlayer() {

    var button = document.getElementById('removePlayer_button');
    button.innerHTML = 'in progress';
    button.disabled = true;

    var playerName = document.getElementById('removePlayerName').value;
    var adminPw = document.getElementById('removeAdminPw').value;
    var gameHash = document.getElementById('gameHash').value;


    web3.personal.unlockAccount(send_acct, send_acct_pw);
    var txHash = contractInstance.removePlayerFromGame(gameHash, playerName, adminPw, {
        from: send_acct,
        gas: gas,
        gasPrice: gasPrice
    });

    console.log(txHash);


    filter = web3.eth.filter('latest', function (error, result) {

        if (!error) {

            console.log(web3.eth.getTransaction(txHash).blockNumber);

            button.innerHTML = 'sent';

            button.disabled = false;

            filter.stopWatching();

            getGame();
            document.getElementById('removePlayerName').value = "Player Name";

            document.getElementById('removeAdminPw').value = "Admin PW";

            $('#removePlayerSlider').slideUp();
        } else {

            console.error(error)

        }

    });


};

function getGamePopup() {
    var gameHash = prompt("Please enter your game key", "0x364317d077d3b41c0ecb76e0d9099d38289c9f47dd6fcb94c84041df519b034e");
    window.location.href = location.protocol + '//' + location.host + location.pathname + "?" + gameHash;
};

function createGamePopup() {
    $("#newGameSection").show();
    $("#activeGameSection").hide();
};

function confirmGameScorePopup(playerName) {
    var playerPW = prompt("A player can only conform the scores of " + playerName + ".\nYou can not confirm your own socres.\n\nPlease enter your password");
    if (playerPW !== null) confirmGameScore(playerName, playerPW);
};

function removePlayerSlideDown() {
    if ($("#removePlayerSlider").is(":visible")) {
        $('#removePlayerSlider').slideUp();
    } else {
        $("#removePlayerSlider").slideDown();
    }
};

function addPlayerSlideDown() {
    if ($("#addPlayerSlider").is(":visible")) {
        $('#addPlayerSlider').slideUp();
    } else {
        $("#addPlayerSlider").slideDown();
    }
};