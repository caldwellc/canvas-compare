// jshint esnext: true
(function (window) {
	'use strict';

	let scale = 1;
	let threshold = 0;
	let sliderScale;
	let sliderThreshold;

	const demo = {};

	demo.update = update;

	window.demo = demo;
	window.addEventListener('load', onLoad, false);

	function onLoad() {
		sliderScale = document.getElementById('sliderScale');
		sliderThreshold = document.getElementById('sliderThreshold');
		update();
	}

	function update() {
		scale = parseFloat(sliderScale.value) || 1;
		threshold = parseFloat(sliderThreshold.value) || 0;
		sliderScale.disabled = true;
		sliderThreshold.disabled = true;
		const params = {
			//baseImageUrl: './images/base.jpg',
			//targetImageUrl: './images/target.jpg',
			//baseImageUrl: './images/1p-01.png',
			//targetImageUrl: './images/1p-02.png',
			//baseImageUrl: './images/tri-01.png',
			//targetImageUrl: './images/tri-02.png',
			//baseImageUrl: './images/tri02-01.png',
			//targetImageUrl: './images/tri02-02.png',
			//baseImageUrl: './images/meadow-01.jpg',
			//targetImageUrl: './images/meadow-02.jpg',
			//baseImageUrl: './images/field-01.jpg',
			//targetImageUrl: './images/field-02.jpg',
			//baseImageUrl: './images/street-01.jpg',
			//targetImageUrl: './images/street-02.jpg',
			//baseImageUrl: './images/cat-01.jpg',
			//targetImageUrl: './images/cat-02.jpg',
			//baseImageUrl: './images/whitenoise-01.jpg',
			//targetImageUrl: './images/whitenoise-02.jpg',
			baseImageUrl: './images/ppl-01.jpg',
			targetImageUrl: './images/ppl-02.jpg',
			scale: scale,
			threshold: threshold
		};
		const imagesToCompare = window.canvasCompare(params);
		imagesToCompare
			.then(onCompare)
			.catch(console.error);
		window.imagesToCompare = imagesToCompare;

		function onCompare(result) {
			console.log({ result: result });
			const diffImage = result.getNormalizedImage();
			const width = diffImage.width;
			const height = diffImage.height;

			console.log('pixels', result.getPixels());
			console.log('percentage', result.getPercentage().toFixed(2) + '%');

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext('2d');
			context.putImageData(diffImage, 0, 0);

			const baseImage = document.getElementById('baseImage');
			baseImage.src = params.baseImageUrl;
			const targetImage = document.getElementById('targetImage');
			targetImage.src = params.targetImageUrl;
			const preview = document.getElementById('preview');

			preview.src = canvas.toDataURL();
			preview.width = Math.round(width / scale) || 1;
			preview.height = Math.round(height / scale) || 1;
			preview.style.imageRendering = 'optimizespeed'; // disable interpolation
			sliderScale.disabled = false;
			sliderThreshold.disabled = false;
		}
	}

})(this);
