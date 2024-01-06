import { writeFileSync } from 'fs';
import * as fs from 'fs';

import pixelmatch from 'pixelmatch';
import Jimp from 'jimp';

//  https://github.com/ColonelParrot/jscanify/wiki
import jscanify from 'jscanify'
import { loadImage } from 'canvas'

function scan(name) {
    // For Debugging: https://colonelparrot.github.io/jscanify/tester.html 

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

            let result_path = path + '_result.jpg'
            writeFileSync(result_path, result_image.toBuffer("image/jpeg"))

        })
    })

}

let objects_list = [] // List of objects (differences between images) + error bounding box

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
                objects_list.push({ x, y });
                // Add neighboring pixels
                for (let dx = -error; dx <= error; dx++) {
                    for (let dy = -error; dy <= error; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            objects_list.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }
    }

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

function toGrayScale(name) {

    let path = './' + name
    Jimp.read(path + '.jpg', (err, img) => {
        if (err) throw err;
        img
            .grayscale()
            .contrast(1) // If <1 then the image will have some gray pixels
            .write(path + '_gray.jpg'); // save
    });
}

// -----------------------------

function isCurveClosed(img) {
    const width = img.bitmap.width;
    const height = img.bitmap.height;

    function isBlack(x, y) {
        const pixel = img.getPixelColor(x, y);
        return pixel === 0x000000FF;
    }

    function floodFill(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height || !isBlack(x, y)) {
            return false;
        }
        img.setPixelColor(0xFFFFFFFF, x, y);
        floodFill(x + 1, y);
        floodFill(x - 1, y);
        floodFill(x, y + 1);
        floodFill(x, y - 1);
        return true;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBlack(x, y) && !floodFill(x, y)) {
                return false;
            }
        }
    }
    return true;
}

// -----------------------------

// #TODO Cum se face diff:
// - Salvează poziția la fiecare modificare + un erorr bounding box și nu verifici niciodată aia la diff
// -

//

/*
1. Scan + convert to standared size
2. GrayScale
3. Diff
4. Save diff + boundix box
*/

diff('test_1_result_gray', 'test_2_result_gray', 0.3);

// Pentru că e async, trebuie cu then
saveObject('diff').then(() => {
    console.log(objects_list);
});


