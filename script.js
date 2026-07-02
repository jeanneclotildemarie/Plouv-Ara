document.addEventListener('DOMContentLoaded', function () {
    fetch('/content/textes_enfants_plouvara.json')
        .then(r => r.json())
        .then(data => {
            const stories = document.querySelectorAll('.bird-story');
            const pool = [...data.texts];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            stories.forEach((story, i) => {
                const entry = pool[i];
                story.querySelector('.bird-story__title:not(.bird-story__author)').textContent = entry.title;
                story.querySelector('.bird-story__author').textContent = entry.author;
                story.querySelector('.bird-story__text').innerHTML = entry.content.replace(/\n/g, '<br>');
            });
        });

    document.querySelectorAll('.weight-labels').forEach(function (labels) {
        const table = labels.closest('.glyph-table');

        const weightMap = {
            'weight-regular': { key: 'regular', activeClass: 'weight-regular--active' },
            'weight-medium':  { key: 'medium',  activeClass: 'weight-medium--active' },
            'weight-bold':    { key: 'bold',     activeClass: 'weight-bold--active' },
        };
        const weightSpans = labels.querySelectorAll('.weight-regular, .weight-medium, .weight-bold');
        const italicSpan  = labels.querySelector('.weight-italic');

        weightSpans.forEach(function (span) {
            span.addEventListener('click', function () {
                weightSpans.forEach(function (s) {
                    Object.values(weightMap).forEach(function (v) { s.classList.remove(v.activeClass); });
                });
                const matched = Object.entries(weightMap).find(([cls]) => span.classList.contains(cls));
                if (matched) {
                    span.classList.add(matched[1].activeClass);
                    table.dataset.weight = matched[1].key;
                }
            });
        });

        if (italicSpan) {
            italicSpan.addEventListener('click', function (e) {
                e.stopPropagation();
                const on = table.dataset.italic === 'true';
                table.dataset.italic = on ? 'false' : 'true';
                italicSpan.classList.toggle('weight-italic--active', !on);
            });
        }
    });
});

const gradients = [
    ['--background-blue', '--background-orange', '--blue', '--svg-yellow'],
    ['--background-yellow', '--background-blue', '--blue', '--svg-pink'],
    ['--background-lavender', '--background-orange', '--purple', '--svg-yellow'],
    ['--background-red', '--background-blue', '--red', '--svg-white']
];

const randomIndex = Math.floor(Math.random() * gradients.length);
const [topColor, bottomColor, textColor, svgColour] = gradients[randomIndex];

document.documentElement.style.setProperty('--gradient-top',    `var(${topColor})`);
document.documentElement.style.setProperty('--gradient-bottom', `var(${bottomColor})`);
document.documentElement.style.setProperty('--text', `var(${textColor})`);
document.documentElement.style.setProperty('--svg-colour', `var(${svgColour})`);
