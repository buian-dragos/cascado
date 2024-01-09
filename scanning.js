import { writeFileSync } from 'fs';
import * as fs from 'fs';

import pixelmatch from 'pixelmatch';
import Jimp from 'jimp';

//  https://github.com/ColonelParrot/jscanify/wiki
import jscanify from 'jscanify'
import { loadImage } from 'canvas'

function scan(name) {
    // For Debugging: https://colonelparrot.github.io/jscanify/tester.html 
    // Scans the image and saves it as name_scan.jpg
    // Also makes all edge pixels white (if errors at scanning appear)


    let path = './' + name
    loadImage(path + '.jpg').then((image) => {
        const scanner = new jscanify()
        let result_width = 842
        let result_height = 595

        // Swap width and height for landscape
        if (image.width > image.height) {
            let t = result_width
            result_width = result_height
            result_height = t
        }

        scanner.loadOpenCV(function (cv) {
            const result_image = scanner.extractPaper(image, result_height, result_width)

            // Make all edge pixels white
            // #TODO: fă să dai crop la edge, nu să le pui o anumită culoare
            result_image.scan(0, 0, result_image.bitmap.width, result_image.bitmap.height, function (x, y, idx) {

                const error = 0

                if (x < error || y < error || x >= result_image.bitmap.width - error || y >= result_image.bitmap.height - error) {
                    this.bitmap.data[idx] = 255
                    this.bitmap.data[idx + 1] = 255
                    this.bitmap.data[idx + 2] = 255
                }
            })

            let result_path = path + '_scan.jpg'
            writeFileSync(result_path, result_image.toBuffer("image/jpeg"))

        })
    })

}

async function saveObject(image_name, error = 3) {
    let path = './' + image_name + '.jpg'

    const image = await Jimp.read(path)

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = image.getPixelColor(x, y);
            const { r, g, b } = Jimp.intToRGBA(pixel);
            if (r > 150 && g < 150 && b < 150) { // Adjust these values for your definition of 'red'
                objectsList.push({ x, y });
                // Add neighboring pixels
                for (let dx = -error; dx <= error; dx++) {
                    for (let dy = -error; dy <= error; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            objectsList.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }
    }

}

function testSaveObject() {
    // Make a copy of diff.jpg and save it as diff_test.jpg, but change all pixels in objectsList to red
    Jimp.read('diff.jpg', (err, image) => {
        if (err) throw err;
        objectsList.forEach(pixel => {
            const x = pixel.x;
            const y = pixel.y;
            image.setPixelColor(Jimp.cssColorToHex('#FF0000'), x, y); // Set the pixel to red
        });
        image.write('diff_test.jpg');
    });
}

async function diff(name_1, name_2, theshold = 0.1) {
    let path_1 = './' + name_1 + '.jpg'
    let path_2 = './' + name_2 + '.jpg'

    const img1 = await Jimp.read(path_1)
    const img2 = await Jimp.read(path_2)

    try {
        // Check if the images have the same dimensions
        if (img1.bitmap.width !== img2.bitmap.width || img1.bitmap.height !== img2.bitmap.height) {
            throw new Error('Image sizes do not match.');
        }

        const diff = new Jimp(img1.bitmap.width, img1.bitmap.height);
        const diffPixels = pixelmatch(
            img1.bitmap.data,
            img2.bitmap.data,
            diff.bitmap.data,
            img1.bitmap.width,
            img1.bitmap.height,
            {
                threshold: theshold,
                alpha: 0.0,
            }
        );

        // Remove all pixels that are in the objectsList from the diff

        objectsList.forEach(pixel => {
            const x = pixel.x;
            const y = pixel.y;
            diff.setPixelColor(Jimp.cssColorToHex('#FFFFFF'), x, y); // Set the pixel to white
        });

        // Save the diff image
        diff.write('diff.jpg', (err) => {
            if (err) {
                throw err;
            } else {
                console.log('Diff saved');
                console.log('Number of different pixels:', diffPixels);
            }
        });


    } catch (error) {
        console.error('Error:', error);
    }

}

function toBlackAndWhite(name, threshold) {
    let path = './' + name;
    Jimp.read(path + '.jpg', (err, img) => {
        if (err) throw err;
        img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
            // Get the grayscale value of the pixel
            let gray = this.bitmap.data[idx] + this.bitmap.data[idx + 1] + this.bitmap.data[idx + 2];
            gray /= 3; // Average the RGB values

            // Convert to black or white based on the threshold
            let color = gray >= threshold ? 255 : 0;

            // Set the pixel to the calculated color
            this.bitmap.data[idx] = color;
            this.bitmap.data[idx + 1] = color;
            this.bitmap.data[idx + 2] = color;
        })
            .write(path + '_bw.jpg'); // save
    });
}

// -----------------------------

function isCurveClosed(name, callback) {

    // Buggy if the curve uses the edges

    let path = './' + name;
    Jimp.read(path + '.jpg', (err, img) => {
        if (err) {
            callback(err, null);
            return;
        }

        const width = img.bitmap.width;
        const height = img.bitmap.height;

        function isWhite(x, y) {
            const pixel = img.getPixelColor(x, y);
            return pixel === 0xFFFFFFFF;
        }

        function floodFill(x, y) {
            let stack = [[x, y]];

            while (stack.length > 0) {
                let [currentX, currentY] = stack.pop();

                if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height || !isWhite(currentX, currentY)) {
                    continue;
                }

                img.setPixelColor(0xFF000000, currentX, currentY);

                stack.push([currentX + 1, currentY]);
                stack.push([currentX - 1, currentY]);
                stack.push([currentX, currentY + 1]);
                stack.push([currentX, currentY - 1]);
            }
        }

        floodFill(0, 0);

        let enclosedArea = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isWhite(x, y)) {
                    enclosedArea++;
                }
            }
        }

        if (enclosedArea === 0) {
            callback(false, 0);
            return;
        }

        // For debgguing, save the image after flood fill
        // img.write(path + '_floodfill.jpg');


        const areaRatio = enclosedArea / (width * height) * 100;

        callback(true, areaRatio);


    });
}

function areLinesFromEdgeToEdge(name, callback, direction) {
    let path = './' + name;
    Jimp.read(path + '.jpg', (err, image) => {
        if (err) {
            callback(err, null);
            return;
        }

        const width = image.bitmap.width;
        const height = image.bitmap.height;

        let first_corner;
        let second_corner;

        // Corrected the assignment (=) to comparison (===)
        if (direction === 'top-bottom') {
            first_corner = [1, 1];
            second_corner = [width - 2, height - 2];
        } else if (direction === 'left-right') {
            first_corner = [1, 1];
            second_corner = [width - 2, height - 2];
        } else if (direction === 'top-right') {
            first_corner = [1, 1];
            second_corner = [width - 2, 1];
        } else if (direction === 'top-left') {
            first_corner = [1, 1];
            second_corner = [width - 2, height - 2];
        } else if (direction === 'bottom-right') {
            first_corner = [1, 1];
            second_corner = [width - 2, height - 2];
        } else if (direction === 'bottom-left') {
            first_corner = [1, height - 2];
            second_corner = [1, 1];
        } else {
            callback(new Error('Invalid direction'), null);
            return;
        }

        function floodFill(coordiante, color) {
            const startX = coordiante[0];
            const startY = coordiante[1];
            let stack = [[startX, startY]];

            while (stack.length > 0) {
                let [x, y] = stack.pop();
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                let currentColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                if (currentColor.r === 255 && currentColor.g === 255 && currentColor.b === 255) {
                    image.setPixelColor(color, x, y);
                    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                }
            }
        }

        floodFill(first_corner, Jimp.rgbaToInt(255, 0, 0, 255));
        floodFill(second_corner, Jimp.rgbaToInt(0, 0, 255, 255));

        let colors = new Set();
        image.scan(0, 0, width, height, function (x, y, idx) {
            let r = this.bitmap.data[idx + 0];
            let g = this.bitmap.data[idx + 1];
            let b = this.bitmap.data[idx + 2];
            colors.add(`${r}-${g}-${b}`);
        });

        // For debugging, save the image after flood fill
        // image.write(path + '_floodfill.jpg');

        // Checks if there are 4 colors (red, blue, white, black)
        if (colors.size === 4) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
}


// -----------------------------

// #TODO: https://teachablemachine.withgoogle.com/

// #TODO Cum se face diff:
// - Salvează poziția la fiecare modificare + un erorr bounding box și nu verifici niciodată aia la diff
// -

//

/*

Attention: Do stuff asyncronously

1. Scan + convert to standared size
2. GrayScale
3. Diff with previous image, ignoring pixels that are in the objectsList
4. Save diff+error results in objectsList
5. Repeat 1->4

*/


let objectsList = [] // List of objects (differences between images) + error bounding box

// toBlackAndWhite('test_2_scan', 150)
// diff('test_1_scan_bw', 'test_2_scan_bw', 0.1)
// saveObject('diff', 3).then(() => {
//     testSaveObject()
// })

isCurveClosed('test', (result, area) => {
    console.log('Is the curve closed?', result);
    console.log('Area Percentage:', Number(area).toFixed(2) + ' %');
});

/* areLinesFromEdgeToEdge('test', (error, result) => {
    console.log('Are lines from edge to edge?', result);
}, 'top-bottom'); */