// jshint esnext: true
(function (outside, undefined) {
	'use strict';

	const ImageData = outside.ImageData;

	outside.canvasCompare = canvasCompare;

	function canvasCompare(params) {
		const instance = produceInstance(params);

		if (!instance) { return; }

		return readImages(instance)
			.then(onReadImages)
			.catch(panic);

		function onReadImages(images) {
			instance.setBaseImage(images[0]);
			instance.setTargetImage(images[1]);
			return compare(instance);
		}
	}

	// Instance-independent logic

	function compare(instance) {
		return new Promise(promiseCompare);

		function promiseCompare(resolve, reject) {
			const baseImage = instance.getBaseImage();
			const targetImage = instance.getTargetImage();
			const isSameWidth = (baseImage.width === targetImage.width);
			const isSameHeight = (baseImage.height === targetImage.height);
			if (!isSameWidth || !isSameHeight) {
				reject('Image size mismatch');
				return;
			}
			const baseData = baseImage.data;
			const targetData = targetImage.data;
			const dataLength = baseData.length;
			const threshold = instance.getThreshold();
			const diffData = new Uint8ClampedArray(dataLength);
			let idxR, idxG, idxB, idxA;
			let diffR, diffG, diffB;
			for (let idx = 0; idx < dataLength; idx += 4) {
				idxR = idx + 0;
				idxG = idx + 1;
				idxB = idx + 2;
				idxA = idx + 3;
				diffR = Math.abs(baseData[idxR] - targetData[idxR]);
				diffG = Math.abs(baseData[idxG] - targetData[idxG]);
				diffB = Math.abs(baseData[idxB] - targetData[idxB]);
				diffData[idxR] = applyThreshold(diffR, threshold);
				diffData[idxG] = applyThreshold(diffG, threshold);
				diffData[idxB] = applyThreshold(diffB, threshold);
				diffData[idxA] = 255;
			}
			const width = baseImage.width;
			const height = baseImage.height;
			const diffImage = new ImageData(diffData, width, height);
			console.log(instance);
			resolve(produceDiffResult(diffImage, instance));
		}
	}

	function applyThreshold(value, threshold) {
		return (value > threshold) ? value : 0;
	}

	function readImages(instance) {
		const baseImageUrl = instance.getBaseImageUrl();
		const targetImageUrl = instance.getTargetImageUrl();
		const scale = instance.getScale();
		return Promise.all([
			readImage(baseImageUrl, scale),
			readImage(targetImageUrl, scale)
		]);
	}

	function readImage(imageUrl, scale) {
		return new Promise(promiseReadImage);

		function promiseReadImage(resolve, reject) {
			const image = new Image();
			image.src = imageUrl;
			image.addEventListener('load', onLoad, false);
			image.addEventListener('error', onError, false);

			function onLoad() {
				const width = image.width * scale;
				const height = image.height * scale;
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext('2d');
				context.drawImage(image, 0, 0, width, height);
				const imageData = context.getImageData(0, 0, width, height);
				if (!isImageData(imageData)) {
					reject('Failed to extract ImageData from `' + imageUrl + '`');
					return;
				}
				resolve(imageData);
			}

			function onError() {
				reject('Failed to load `' + imageUrl + '`');
			}
		}
	}

	// Diff result logic
	
	function produceDiffResult(diffImage, instance) {
		const internals = {};
		const externals = {};

		if (!setImage(diffImage)) { return; }

		externals.getImage = getImage;
		externals.getNormalizedImage = getNormalizedImage;
		externals.getPixels = getPixels;
		externals.getPercentage = getPercentage;
		externals.producePreview = producePreview;

		return externals;

		function producePreview(isNormalized) {
			const image = isNormalized ? getNormalizedImage() : getImage();
			const canvas = document.createElement('canvas');
			const scale = instance.getScale();
			const width = image.width;
			const height = image.height;
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d');
			context.putImageData(image, 0, 0);
			const imageElement = new Image();
			imageElement.src = canvas.toDataURL();
			imageElement.style.imageRendering = 'optimizespeed';
			imageElement.width = Math.round(width / scale);
			imageElement.height = Math.round(height / scale);
			return imageElement;
		}

		function getPercentage() {
			const image = getImage();
			const pixels = getPixels();
			const totalPixels = image.data.length / 4;
			const percent = totalPixels / 100;
			return pixels / percent;
		}

		function getPixels() {
			const image = getImage();
			const data = image.data;
			const dataLength = data.length;
			let score = 0;
			let idxR, idxG, idxB, idxA;
			for (let idx = 0; idx < dataLength; idx += 4) {
				idxR = idx + 0;
				idxG = idx + 1;
				idxB = idx + 2;
				idxA = idx + 3;
				if (data[idxR] || data[idxG] || data[idxB]) {
					score += 1;
				}
			}
			return score;
		}

		function getNormalizedImage() {
			const image = getImage();
			const data = image.data;
			const dataLength = data.length;
			const normalizedData = new Uint8ClampedArray(dataLength);
			let idxR, idxG, idxB, idxA;
			for (let idx = 0; idx < dataLength; idx += 4) {
				idxR = idx + 0;
				idxG = idx + 1;
				idxB = idx + 2;
				idxA = idx + 3;
				normalizedData[idxR] = data[idxR] ? 255 : 0;
				normalizedData[idxG] = data[idxG] ? 255 : 0;
				normalizedData[idxB] = data[idxB] ? 255 : 0;
				normalizedData[idxA] = 255;
			}
			const width = image.width;
			const height = image.height;
			const normalizedImage = new ImageData(normalizedData, width, height);
			return normalizedImage;
		}

		function getImage() {
			return internals.image;
		}

		function setImage(imageData) {
			if (!isImageData(imageData)) {
				return panic('No diff ImageData provided');
			}
			internals.image = imageData;
			return getImage();
		}
	}

	// Instance logic

	function produceInstance(params) {
		const internals = {};
		const externals = {};

		if (!isObject(params)) {
			return panic('No parameters provided');
		}
		if (!setBaseImageUrl(params.baseImageUrl)) { return; }
		if (!setTargetImageUrl(params.targetImageUrl)) { return; }

		setScale(params.scale);
		setThreshold(params.threshold);

		externals.getTargetImageUrl = getTargetImageUrl;
		externals.getBaseImageUrl = getBaseImageUrl;
		externals.getScale = getScale;
		externals.getThreshold = getThreshold;
		externals.setBaseImage = setBaseImage;
		externals.getBaseImage = getBaseImage;
		externals.setTargetImage = setTargetImage;
		externals.getTargetImage = getTargetImage;

		return externals;

		function getTargetImage() {
			return internals.targetImage;
		}

		function setTargetImage(imageData) {
			if (!isImageData(imageData)) {
				return panic('No targetImageData provided');
			}
			internals.targetImage = imageData;
			return getTargetImage();
		}

		function getBaseImage() {
			return internals.baseImage;
		}

		function setBaseImage(imageData) {
			if (!isImageData(imageData)) {
				return panic('No baseImageData provided');
			}
			internals.baseImage = imageData;
			return getBaseImage();
		}

		function getTargetImageUrl() {
			return internals.targetImageUrl;
		}

		function setTargetImageUrl(targetImageUrl) {
			if (!isNonEmptyString(targetImageUrl)) {
				return panic('Failed to set targetImageUrl: `' + targetImageUrl + '`');
			}
			internals.targetImageUrl = targetImageUrl;
			return getTargetImageUrl();
		}

		function getBaseImageUrl() {
			return internals.baseImageUrl;
		}

		function setBaseImageUrl(baseImageUrl) {
			if (!isNonEmptyString(baseImageUrl)) {
				return panic('Failed to set baseImageUrl: `' + baseImageUrl + '`');
			}
			internals.baseImageUrl = baseImageUrl;
			return getBaseImageUrl();
		}

		function getThreshold() {
			return internals.threshold;
		}

		function setThreshold(threshold) {
			internals.threshold = sanitizeThreshold(threshold);
		}

		function getScale() {
			return internals.scale;
		}

		function setScale(scale) {
			internals.scale = sanitizeScale(scale);
		}
	}

	// Utility stuff

	function sanitizeThreshold(threshold) {
		const MIN_THRESHOLD = 0;
		const MAX_THRESHOLD = 255;
		if (!isNumber(threshold)) {
			return MIN_THRESHOLD;
		}
		if (threshold > MAX_THRESHOLD) {
			return MAX_THRESHOLD;
		}
		if (threshold < MIN_THRESHOLD) {
			return MIN_THRESHOLD;
		}
		return threshold;
	}

	function sanitizeScale(scale) {
		const MIN_SCALE = 0.01;
		const MAX_SCALE = 1;
		if (!isNumber(scale)) {
			return MAX_SCALE;
		}
		if (scale > MAX_SCALE) {
			return MAX_SCALE;
		}
		if (scale < MIN_SCALE) {
			return MIN_SCALE;
		}
		return scale;
	}

	function isImageData(item) {
		return toStringCall(item) === '[object ImageData]';
	}

	function isNumber(item) {
		return (toStringCall(item) === '[object Number]') &&
			isFinite(item);
	}

	function isNonEmptyString(item) {
		return (toStringCall(item) === '[object String]') &&
			(item.length > 0);
	}

	function isObject(item) {
		return toStringCall(item) === '[object Object]';
	}

	function toStringCall(item) {
		return Object.prototype.toString.call(item);
	}

	function panic(reason) {
		console.error('[canvas-compare]: ' + reason);
		return;
	}

})(this);
