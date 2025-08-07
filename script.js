const uploadArea = document.body;
const barcodeInput = document.getElementById('barcodeInput');
barcodeInput.addEventListener('change', function (event) {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const imgSrc = e.target.result;
            const previewImage = document.getElementById('previewImage');
            previewImage.src = imgSrc;
            document.getElementById('image-preview-area').classList.remove('hidden');
            decodeBarcode(imgSrc);
        };
        reader.readAsDataURL(file);
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        barcodeInput.files = e.dataTransfer.files;
        const event = new Event('change', {bubbles: true});
        barcodeInput.dispatchEvent(event);
    }
});

document.getElementById('rotateBtn').addEventListener('click', () => {
    const previewImage = document.getElementById('previewImage');
    rotateImageInCanvas(previewImage.src,90, function (rotatedSrc) {
        previewImage.src = rotatedSrc;
    })
});

function decodeBarcode(imageSrc, rotationDegree = 0) {

    document.getElementById('noResultFoundArea').classList.add('hidden');
    document.getElementById('resultFoundArea').classList.add('hidden');
    document.getElementById('processingArea').classList.add('hidden');


    rotateImageInCanvas(imageSrc, rotationDegree, function (rotatedSrc) {
        Quagga.decodeSingle({
            src: rotatedSrc,
            locate: false,
            numOfWorkers: navigator.hardwareConcurrency || 0,
            decoder: {
                readers: ['code_128_reader']
            }
        }, function (result) {
            document.getElementById('image_buttons').classList.remove('hidden');
            if (result && result.codeResult && result.codeResult.code.length === 18) {
                addResultsToHtml(result.codeResult.code);
                previewImage.src = rotatedSrc;
                document.getElementById('resultFoundArea').classList.remove('hidden');
                document.getElementById('noResultFoundArea').classList.add('hidden');
                document.getElementById('processingArea').classList.add('hidden');
            } else if (rotationDegree < 360) {
                decodeBarcode(imageSrc, rotationDegree + 15);
                document.getElementById('processingArea').classList.remove('hidden');
                const dots = '.'.repeat(((rotationDegree/15) % 3) + 1);
                document.getElementById('processingArea').innerText = `${dots} Processing ${dots}`;
            } else {
                document.getElementById('noResultFoundArea').classList.remove('hidden');
                document.getElementById('resultFoundArea').classList.add('hidden');
                document.getElementById('processingArea').classList.add('hidden');
            }
        });

    });
}

function rotateImageInCanvas(imageSrc, rotationDegree,callback) {
    const img = new Image();
    img.onload = function () {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.save();
        ctx.filter = 'grayscale(100%) contrast(200%) brightness(80%)';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotationDegree * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        callback(canvas.toDataURL());

    };
    img.src = imageSrc;
}

document.getElementById('barcodeValue').addEventListener('keyup', function (event) {
    addResultsToHtml(event.target.value);
});

function addResultsToHtml(barcode) {
    document.getElementById('barcodeValue').value = barcode;
    if (barcode.length === 18) {
        document.getElementById('barcodeValueFormatted').innerText =
            barcode.substring(0, 2) + "." +
            barcode.substring(2, 4) + "." +
            barcode.substring(4, 10) + "." +
            barcode.substring(10, 18);
    }
    let element = document.getElementById('links');
    let configJson = localStorage.getItem('barcodeConfig') || sampleConfig;
    let links = [];
    try {
        let config = JSON.parse(configJson);
        links = config.map(item => {
            let url = item.link.replace(/##barcode##/g, barcode);
            let text = item.text || url;
            return `<a target="_blank" href="${url}">${text}</a>`;
        });
    } catch (e) {
        console.log('error parsing config:', e);
        links = [];
    }
    element.innerHTML = links.join(' &nbsp; | &nbsp; ');
}


const cropBtn = document.getElementById('cropBtn');
cropBtn.addEventListener('click', toggleCrop);
const cropRect = document.getElementById('cropRect');
cropRect.addEventListener('dblclick', endCrop);

const cropOverlay = document.getElementById('cropOverlay');
const previewImage = document.getElementById('previewImage');

let cropping = false;
let cropStart = {x: 50, y: 50};
let cropSize = {w: 200, h: 200};
let dragHandle = null;
let dragOffset = {x: 0, y: 0};

function updateCropRect() {
    cropRect.style.left = cropStart.x + 'px';
    cropRect.style.top = cropStart.y + 'px';
    cropRect.style.width = cropSize.w + 'px';
    cropRect.style.height = cropSize.h + 'px';
}



function toggleCrop() {
    cropping = !cropping;
    cropOverlay.classList.toggle('hidden', !cropping);
    if (cropping) {
        cropOverlay.style.position = 'absolute';
        cropOverlay.style.left = '0';
        cropOverlay.style.top = '0';
        cropOverlay.style.width = previewImage.width + 'px';
        cropOverlay.style.height = previewImage.height + 'px';
        cropOverlay.style.pointerEvents = 'auto';
        updateCropRect();
    }
}


cropRect.querySelectorAll('.handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
        dragHandle = handle.classList[1];
        dragOffset.x = e.clientX;
        dragOffset.y = e.clientY;
        document.body.style.userSelect = 'none';
    });
});

document.addEventListener('mousemove', (e) => {
    if (!dragHandle) return;
    let dx = e.clientX - dragOffset.x;
    let dy = e.clientY - dragOffset.y;
    if (dragHandle === 'top-left') {
        cropStart.x += dx;
        cropStart.y += dy;
        cropSize.w -= dx;
        cropSize.h -= dy;
    } else if (dragHandle === 'top-right') {
        cropStart.y += dy;
        cropSize.w += dx;
        cropSize.h -= dy;
    } else if (dragHandle === 'bottom-left') {
        cropStart.x += dx;
        cropSize.w -= dx;
        cropSize.h += dy;
    } else if (dragHandle === 'bottom-right') {
        cropSize.w += dx;
        cropSize.h += dy;
    }
    cropSize.w = Math.max(20, cropSize.w);
    cropSize.h = Math.max(20, cropSize.h);
    cropStart.x = Math.max(0, cropStart.x);
    cropStart.y = Math.max(0, cropStart.y);
    updateCropRect();
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
});

document.addEventListener('mouseup', () => {
    dragHandle = null;
    document.body.style.userSelect = '';
});


function endCrop() {
    const img = previewImage;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const sx = cropStart.x * scaleX;
    const sy = cropStart.y * scaleY;
    const sw = cropSize.w * scaleX;
    const sh = cropSize.h * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    previewImage.src = canvas.toDataURL();
    cropOverlay.classList.add('hidden');
    cropping = false;
    decodeBarcode(previewImage.src);
}

const configGear = document.getElementById('configGear');
const configSection = document.getElementById('configSection');
const configTextarea = document.getElementById('configTextarea');
const configSaveBtn = document.getElementById('configSaveBtn');
const configSaveConfirm = document.getElementById('configSaveConfirm');

const sampleConfig = JSON.stringify([{
    "link": "https://service.post.ch/ekp-web/external/view/##barcode##",
    "text": "Sendungsverfolgung"
}], null, 2);

function loadConfig() {
    const stored = localStorage.getItem('barcodeConfig');
    configTextarea.value = stored ? stored : sampleConfig;
    configSaveConfirm.classList.add('hidden');
}

configGear.addEventListener('click', () => {
    configSection.classList.toggle('hidden');
    loadConfig();
});

configSaveBtn.addEventListener('click', () => {
    localStorage.setItem('barcodeConfig', configTextarea.value);
    configSaveConfirm.classList.remove('hidden');
    setTimeout(() => configSaveConfirm.classList.add('hidden'), 1500);
});
