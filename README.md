# robot-webgl

[View webpage here](https://andynguyen-swdev.github.io/robot-webgl/).

This project renders a simple robot with a cylinder base and two rectangular arms. The Phong illumination model is used to shade the robot. 

## Sphere fetching

After pressing the Fetch button, a sphere will spawn at (`old_x`, `old_y`, `old_z`), and then be moved to (`new_x`, `new_y`, `new_z`) by the robot. The motion is only carried out if the starting and ending position of the sphere is within the reach of the robot.

## Parameters

These following parameters can be modified directly in console and updated in real time.

| Parameter          | Description                                    |
|--------------------|------------------------------------------------|
| `BASE_HEIGHT`      | The height of the robot's base (a cylinder)    |
| `BASE_RADII`       | The radius of the robot's base (a cylinder)    |
| `LOWER_ARM_HEIGHT` | The height (length) of the robot's lower arm   |
| `LOWER_ARM_WIDTH`  | The width (thickness) of the robot's lower arm |
| `UPPER_ARM_HEIGHT` | Same as above but for upper arm                |
| `UPPER_ARM_WIDTH`  | Same as above but for upper arm                |
| `SPHERE_RADIUS`    | The radius of the sphere to be fetched         |
