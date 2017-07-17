const canvas = { width: 800, height: 400 };

var server, rpc = new Eureca.Client();

var paddle, paddle1, paddle2,
    followingMouse = true,
    follows = 0; // which paddle

var game, ball, ballOnPaddle = true,
    score1, score2,
    scoreText, introText,
    paddle, whoami = 0;

game = new Phaser.Game(canvas.width, canvas.height, Phaser.AUTO, 'phaser-example', {
    preload: preload, create: create, update: update
});

rpc.ready(s => {
    server = s;

    rpc.exports.startGame = (settings) => {
        console.log(`server starts game`);

        whoami = settings.whoareyou;
        console.log(settings);

        score1 = 0; score2 = 0;

        if (whoami < 2) {
            paddle = whoami % 2 ? paddle2 : paddle1;
            console.log(`whoami: ${whoami % 2 ? 'right' : 'left'}`);
        }
    };

    rpc.exports.updateScore = ({ turn: turn, left: ls, right: rs }) => {
        scoreText.text = `${ls} : ${rs}`;

        followingMouse = true;
        follows = turn;
    };

    rpc.exports.updateState = state => {
        paddle1.x = state.left.x;
        paddle1.y = state.left.y;

        paddle2.x = state.right.x;
        paddle2.y = state.right.y;


        //console.log(state.ball.x, " ", state.ball.y);

        ball.x = state.ball.x;
        ball.y = state.ball.y;

        // console.debug(`Update state: ${state}`);
    }
});


function preload() {
    game.stage.disableVisibilityChange = true;
    game.load.image('starfield', 'starfield.jpg');
    game.load.image('breakout', 'breakout.png');
    game.load.image('breakout2', 'breakout2.png');
    game.load.image('ball', 'ball.png');
}

function create() {
    console.log(`phaser create()`);
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // We check bounds collisions against all walls other than the bottom one
    game.physics.arcade.checkCollision.left = false;
    game.physics.arcade.checkCollision.right = false;

    game.add.tileSprite(0, 0, canvas.width, canvas.height, 'starfield');

    paddle1 = game.add.sprite(20, game.world.centerY, 'breakout');
    paddle2 = game.add.sprite(canvas.width - 20, game.world.centerY, 'breakout2');
    //if (whoami < 2) { paddle = whoami % 2 ? paddle1 : paddle2 }

    paddle1.anchor.setTo(0, 0);
    paddle2.anchor.setTo(0, 0);

    game.physics.enable(paddle1, Phaser.Physics.ARCADE);
    game.physics.enable(paddle2, Phaser.Physics.ARCADE);

    paddle1.body.collideWorldBounds = true;
    paddle1.body.bounce.set(1);
    paddle1.body.immovable = true;

    paddle2.body.collideWorldBounds = true;
    paddle2.body.bounce.set(1);
    paddle2.body.immovable = true;

    ball = game.add.sprite(paddle1.centerX, paddle1.y, 'ball');
    ball.anchor.set(0);
    ball.checkWorldBounds = true;

    game.physics.enable(ball, Phaser.Physics.ARCADE);

    ball.body.collideWorldBounds = true;
    ball.body.bounce.set(1);

    //ball.events.onOutOfBounds.add(ballLost, this);

    scoreText = game.add.text(game.world.centerX - 20, 20, '0 : 0',      { font: "30px Arial", fill: "#ffffff", align: "left" });
    introText = game.add.text(game.world.centerX, canvas.width / 2, '', { font: "40px Arial", fill: "#ffffff", align: "center" });

    introText.anchor.setTo(0.5, 0.5);

    game.input.onDown.add(() => {   introText.visible = false;
                                    server.buttonPush();
                                    followingMouse = false;
                                 }, this);

}

function update() {
    if (paddle) {
        server.updatePlayerPosition(game.input.y)
        // paddle.y = game.input.y;
        //
        // var bound = 40;
        //
        // if (paddle.y < bound)
        //     paddle.y = bound;
        // else if (paddle.y > canvas.height - bound)
        //     paddle.y = canvas.height - bound;
    }

    // if (followingMouse) {
    //     if (follows == 0) {
    //         ball.x = paddle1.body.x + paddle1.body.width + 12;
    //         ball.y = paddle1.body.y + paddle1.height / 2;
    //     } else {
    //         ball.x = paddle2.body.x - (paddle2.body.width + 12);
    //         ball.y = paddle2.body.y+ paddle2.height / 2;
    //     }
    // }
}
