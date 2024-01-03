import { writeFileSync } from 'fs';
import * as fs from 'fs';



//  https://github.com/ColonelParrot/jscanify/wiki
import jscanify from 'jscanify'
import { loadImage } from 'canvas'

function scan(name) {

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

import pixelmatch from 'pixelmatch';
import Jimp from 'jimp';

function diff(img1, img2, theshold = 0.1) {
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

function toGrayScale(img) {
    img.grayscale().write('grayscale.jpg')
}

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


const img1 = await Jimp.read('paint_1.jpg');
const img2 = await Jimp.read('paint_2.jpg');

//scan('test')

diff(img1, img2, 0.5);

console.log(isCurveClosed(img1))

