import Phaser from "phaser";

export default class ExperienceGem extends Phaser.Physics.Arcade.Sprite {

    constructor(
        scene,
        x,
        y,
        value
    ) {

        super(
            scene,
            x,
            y,
            "gem"
        );

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.value = value;

        this.body.setAllowGravity(
            false
        );

    }

}