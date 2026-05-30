import Phaser from "phaser";

export default class Projectile extends Phaser.Physics.Arcade.Sprite {

    constructor(
        scene,
        x,
        y,
        target,
        damage
    ) {

        super(
            scene,
            x,
            y,
            "bullet"
        );

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.damage = damage;

        const angle =
            Phaser.Math.Angle.Between(
                x,
                y,
                target.x,
                target.y
            );

        scene.physics.velocityFromRotation(
            angle,
            500,
            this.body.velocity
        );

        this.lifeTime = 3000;

        scene.time.delayedCall(

            this.lifeTime,

            () => {

                if (this.active) {
                    this.destroy();
                }

            }

        );

    }

}