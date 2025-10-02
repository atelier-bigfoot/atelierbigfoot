const svg = document.querySelector('#svg_yeux');
const oeilG = document.querySelector('#oeil_g');
const oeilD = document.querySelector('#oeil_d');
const irisG = document.querySelector('#iris_g');
const irisD = document.querySelector('#iris_d');
const pupilleG = document.querySelector('#pupille_g');
const pupilleD = document.querySelector('#pupille_d');

function getElementCenter(el) {
    const bbox = el.getBBox();
    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
    };
}

document.addEventListener('mousemove', (e) => {
    const svgRect = svg.getBoundingClientRect();
    const mouseX = e.clientX - window.innerWidth / 2;
    const mouseY = e.clientY - window.innerHeight / 2;

    const oeilGCenter = getElementCenter(oeilG);
    const oeilDCenter = getElementCenter(oeilD);

    function followMouseProportional(element, centerX, centerY, maxDistance) {
        const elCenterX = centerX - svgRect.left;
        const elCenterY = centerY - svgRect.top;

        const dx = mouseX;
        const dy = mouseY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);

        const translateX = distance * Math.cos(angle);
        const translateY = distance * Math.sin(angle);

        element.setAttribute('transform', `translate(${translateX} ${translateY})`);
    }

    const maxDistanceIris = svgRect.width * 0.3;
    const maxDistancePupille = svgRect.width * 0.45;

    followMouseProportional(irisG, oeilGCenter.x, oeilGCenter.y, maxDistanceIris);
    followMouseProportional(irisD, oeilDCenter.x, oeilDCenter.y, maxDistanceIris);
    followMouseProportional(pupilleG, oeilGCenter.x, oeilGCenter.y, maxDistancePupille);
    followMouseProportional(pupilleD, oeilDCenter.x, oeilDCenter.y, maxDistancePupille);
});

