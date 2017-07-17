'use strict';

let express = require('express'), app = express(),
    server = require('http').createServer(app),
    JsonRPC = require('eureca.io'),
    rpc = new JsonRPC.Server({ allow: ['updateScore', 'updateState', 'startGame'] });

const game_speed = 75;

var
    canvas = { width: 800, height: 400 },
    game = {
        // are you here, pretty? yep
        left:  { x: 4,  y: 0, w: 16, h: 72, score: 0, name: 'left' },
        right: { x: canvas.width - 40 , y: 0, w: 16, h: 72, score: 0, name: 'right' },
        over:  { score: 3 },
        run:   false,
        turn:  0
    };

    game.ball = { x: 0,   y: 0, r: 12, vx: canvas.width / 30, vy: 0, move: followMouse(game.left) };

function collide(circle, rect) {
    var distX = 0;
    var distY = 0;
    var dx = 0;
    var dy = 0;

    distX = Math.abs(circle.x - rect.x-rect.w/2);
    distY = Math.abs(circle.y - rect.y-rect.h/2);

    if (distX > (rect.w/2 + circle.r)) { return false; }
    if (distY > (rect.h/2 + circle.r)) { return false; }

    if (distX <= (rect.w/2)) { return true; }
    if (distY <= (rect.h/2)) { return true; }

    dx = distX - rect.w/2;
    dy = distY - rect.h/2;
    return dx*dx + dy*dy <= circle.r*circle.r;
}

function followMouse( paddle ) {
    return () => {
        game.ball.x = paddle.x + paddle.w / 2 + game.ball.r - 5;
        game.ball.y = paddle.y + paddle.h / 2 - game.ball.r;
    }

}

var velocityMove = () => {
    let ball = game.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;
    //console.log(ball.vy, ball.y);

    // check collision with top-bottom walls
    if (ball.y + 2*ball.r + 1>= canvas.height) {
        ball.y = canvas.height - 2*ball.r;
        ball.vy = -ball.vy;
    }

    if (ball.y - 1 <= 0) {
        ball.y = 1;
        ball.vy = -ball.vy;
    }

    // on lost
    //console.log(ball.x);
    if (ball.x > canvas.width) {
        game.left.score++;
        updateScore();
    } else if (ball.x + 2*ball.r < 0) {
        game.right.score++;
        updateScore();
    }

    collide(ball, game.left) && hitPaddle(ball, game.left);
    collide(ball, {x: game.right.x-16, y: game.right.y, w: 8, h: 72}) && hitPaddle(ball, game.right);
}

function hitPaddle(ball, paddle) {
    var diff = 0;

    if (paddle == game.right && ball.vx > 0)
        ball.vx = -ball.vx;

    if (paddle == game.left && ball.vx < 0)
        ball.vx = -ball.vx;


    if (ball.y + ball.r + paddle.h / 2 < paddle.y) {
        //  Ball is on the left-hand side of the paddle
        //diff = paddle.y - ball.y;
        //ball.vy = (-2 * diff);
        ball.vy = (Math.random() * 2 - 1) * ball.vx;
        //console.log("1", ball.vy);
    } else if (ball.y + ball.r + paddle.h / 2 > paddle.y) {
        //  Ball is on the right-hand side of the paddle
        //diff = ball.y - paddle.y;
        //ball.vy = (2 * diff);
        ball.vy = (Math.random() * 2 - 1) * ball.vx;
        //console.log("2", ball.vy);
    } else {
        //  Ball is perfectly in the middle
        //  Add a little random X to stop it bouncing straight up!
        //ball.vy = 10 + Math.random() * 8;
        //console.log("3", ball.vy);
    }
}

var updateGame = () => {
    // if (!game.run)
        // return clearInterval(timer);

    game.ball.move();
    users.forEach(c => c.clientProxy.updateState({
        ball:   { x: game.ball.x, y: game.ball.y },
        left:   { x: game.left.x, y: game.left.y },
        right:  { x: game.right.x, y: game.right.y }
    }));
};

var users = [], users_count = 0, timer = setInterval(updateGame, game_speed);

rpc.onConnect(conn => {
    //console.info(`user "${conn.socket.id}" connected`);

    users_count += 1;
    users.push(conn);
    resetGame();


    if (users_count == 2) {
         game.run = true;
        // resetGame();
    }
});

function resetGame() {
    //console.info(`reset game`);
    users.forEach((u, i) => u.clientProxy.startGame({ whoareyou: i }));

    //game.ball.vx = canvas.width / 100;
    //game.ball.vy = canvas.width / 100;
    game.move = followMouse(game.left);

    game.left.score = 0;
    game.right.score = 0;

    users.forEach((u, i) => u.clientProxy.updateScore({ left: game.left.score, right: game.right.score }));
}

rpc.onDisconnect(conn => {
    //console.info(`user "${conn.socket.id}"`);
    users_count -= 1;

    if (users_count < 2)
        game.run = false;

    // console.log('kek', Object.keys(this))
    let i = users.findIndex(u => u.socket.id == conn.socket.id);

    if (i < 2)
        resetGame();

    users.splice(i, 1);
})

var detectPlayer = id => {
    if (id == users[0].socket.id) return game.left;
    if (id == users[1].socket.id) return game.right;
    return null;
}

rpc.exports.buttonPush = function () {

    let paddle = detectPlayer(this.socket.id);
    if (paddle === game.left)
    //console.log("buttonPush");
    game.ball.move = velocityMove;
}


rpc.exports.updatePlayerPosition = function (y) {
    //console.log('updatePlayerPosition');

    let paddle = detectPlayer(this.socket.id),
        bound = 40;

    //

    if (paddle) {
        //console.log(` ${this.socket.id}: update paddle ${paddle.name}, y=${y}`);
        //console.log(paddle.y, canvas.height - bound, paddle.y > canvas.height - bound)
        paddle.y = y;
        if (paddle.y < 10)
            paddle.y = 10;
        else if (paddle.y  >= canvas.height - 2*bound){
            paddle.y = canvas.height - 2*bound;
        }
    }
}

function updateScore() {
    //game.ball.move = followMouse(++game.turn % 2 ? game.left : game.right);
    game.ball.move = followMouse(game.left);
    game.ball.vx = canvas.width / 30


    users.forEach((u, i) => u.clientProxy.updateScore({ left: game.left.score, right: game.right.score }));

    if (game.left.score == game.over.score || game.right.score == game.over.score) {
        // first two users loose their controls
        //users = users.slice(2).concat(users.slice(0, 2));
    }
}


app.get('/', function (req, res, next) { res.sendfile('public/index.html') });
app.use(express.static('public'));
rpc.attach(server);
server.listen(8080);
