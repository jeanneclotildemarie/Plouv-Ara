(function () {
    'use strict';

    var CONFIG = {
        shapes: [
            { className: 'svg-star-4', size: 38 },
            { className: 'svg-star-8', size: 20 },
            { className: 'svg-circle', size: 16 },
        ],
        protectedSelectors: 'h1, p, a, .weight-labels, .glyph-cell',
        protectedShapes: '.svg-icon:not(.decor-shape), .icon',
        protectedBlocks: '.footer-flower',
        mapScale: 0.35,
        margin: 20,
        clusterCount: 7,
        clusterSizeRange: [3, 6],
        clusterRadius: 90,
        loneCount: 45,
        maxAttempts: 250,
    };

    var layer = null;
    var imageCache = {};
    var scatterChain = Promise.resolve();

    function ensureLayer() {
        layer = document.getElementById('decor-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'decor-layer';
            layer.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(layer, document.body.firstChild);
        }
        return layer;
    }

    function randBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function boxFrom(x, y, size) {
        return { left: x, top: y, right: x + size, bottom: y + size };
    }

    function boxesOverlap(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function overlapsAny(box, list) {
        for (var i = 0; i < list.length; i++) {
            if (boxesOverlap(box, list[i])) return true;
        }
        return false;
    }

    function resolveUrl(url) {
        try {
            return new URL(url, window.location.href).href;
        } catch (e) {
            return null;
        }
    }

    function isSameOrigin(absUrl) {
        try {
            return new URL(absUrl).origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    function loadImage(absUrl) {
        if (!imageCache[absUrl]) {
            imageCache[absUrl] = new Promise(function (resolve) {
                var img = new Image();
                img.onload = function () { resolve(img); };
                img.onerror = function () { resolve(null); };
                img.src = absUrl;
            });
        }
        return imageCache[absUrl];
    }

    function extractShapeUrl(el) {
        var style = getComputedStyle(el);
        var raw = style.getPropertyValue('mask-image') ||
            style.getPropertyValue('-webkit-mask-image') ||
            style.getPropertyValue('--icon');
        if (!raw || raw === 'none') return null;
        var m = /url\((['"]?)(.*?)\1\)/.exec(raw);
        return m ? m[2] : null;
    }

    function getFlipSigns(el) {
        var t = getComputedStyle(el).transform;
        if (!t || t === 'none') return { x: 1, y: 1 };
        var m = /matrix\(([^)]+)\)/.exec(t);
        if (!m) return { x: 1, y: 1 };
        var v = m[1].split(',').map(parseFloat);
        return { x: v[0] < 0 ? -1 : 1, y: v[3] < 0 ? -1 : 1 };
    }

    function getProtectedTextRects() {
        var els = document.querySelectorAll(CONFIG.protectedSelectors);
        var rects = [];
        els.forEach(function (el) {
            if (!el.textContent || !el.textContent.trim()) return;
            var r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            rects.push({
                left: r.left + window.scrollX - CONFIG.margin,
                top: r.top + window.scrollY - CONFIG.margin,
                right: r.right + window.scrollX + CONFIG.margin,
                bottom: r.bottom + window.scrollY + CONFIG.margin,
            });
        });
        return rects;
    }

    function getProtectedBlockRects() {
        var els = document.querySelectorAll(CONFIG.protectedBlocks);
        var rects = [];
        els.forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            rects.push({
                left: r.left + window.scrollX - CONFIG.margin,
                top: r.top + window.scrollY - CONFIG.margin,
                right: r.right + window.scrollX + CONFIG.margin,
                bottom: r.bottom + window.scrollY + CONFIG.margin,
            });
        });
        return rects;
    }

    function containFit(imgW, imgH, boxW, boxH) {
        var scale = Math.min(boxW / imgW, boxH / imgH);
        var w = imgW * scale;
        var h = imgH * scale;
        return { w: w, h: h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
    }

    async function paintShapeSilhouette(ctx, el) {
        var url = extractShapeUrl(el);
        if (!url) return;
        var absUrl = resolveUrl(url);
        if (!absUrl || !isSameOrigin(absUrl)) return;
        var img = await loadImage(absUrl);
        if (!img || !img.naturalWidth || !img.naturalHeight) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        var x = r.left + window.scrollX;
        var y = r.top + window.scrollY;
        var flip = getFlipSigns(el);
        var fit = containFit(img.naturalWidth, img.naturalHeight, r.width, r.height);
        ctx.save();
        ctx.translate(x + r.width / 2, y + r.height / 2);
        ctx.scale(flip.x, flip.y);
        ctx.drawImage(img, -r.width / 2 + fit.x, -r.height / 2 + fit.y, fit.w, fit.h);
        ctx.restore();
    }

    async function buildObstacleMap(pageWidth, pageHeight) {
        var scale = CONFIG.mapScale;
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(pageWidth * scale));
        canvas.height = Math.max(1, Math.ceil(pageHeight * scale));
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#000';
        getProtectedTextRects().concat(getProtectedBlockRects()).forEach(function (r) {
            ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
        });

        var shapeEls = document.querySelectorAll(CONFIG.protectedShapes);
        for (var i = 0; i < shapeEls.length; i++) {
            await paintShapeSilhouette(ctx, shapeEls[i]);
        }

        return { canvas: canvas, ctx: ctx, scale: scale };
    }

    function isAreaFree(map, box) {
        var x = Math.round(box.left * map.scale);
        var y = Math.round(box.top * map.scale);
        var w = Math.max(1, Math.round((box.right - box.left) * map.scale));
        var h = Math.max(1, Math.round((box.bottom - box.top) * map.scale));
        if (x < 0 || y < 0 || x + w > map.canvas.width || y + h > map.canvas.height) return false;
        var data = map.ctx.getImageData(x, y, w, h).data;
        for (var i = 3; i < data.length; i += 4) {
            if (data[i] > 10) return false;
        }
        return true;
    }

    function createShapeEl(box, className) {
        var el = document.createElement('span');
        el.className = 'svg-icon decor-shape deco--dark ' + className;
        el.style.left = box.left + 'px';
        el.style.top = box.top + 'px';
        el.style.width = (box.right - box.left) + 'px';
        el.style.height = (box.bottom - box.top) + 'px';
        return el;
    }

    async function addShape(map, box, className) {
        var el = createShapeEl(box, className);
        layer.appendChild(el);
        await paintShapeSilhouette(map.ctx, el);
    }

    async function placeCluster(pageWidth, pageHeight, map, reservedZones) {
        var clusterSize = Math.floor(randBetween(CONFIG.clusterSizeRange[0], CONFIG.clusterSizeRange[1] + 1));
        var r = CONFIG.clusterRadius;
        var center = null;

        for (var a = 0; a < CONFIG.maxAttempts; a++) {
            var cx = randBetween(CONFIG.margin + r, pageWidth - CONFIG.margin - r);
            var cy = randBetween(CONFIG.margin + r, pageHeight - CONFIG.margin - r);
            var zone = { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r };
            if (!isAreaFree(map, zone)) continue;
            if (overlapsAny(zone, reservedZones)) continue;
            center = { cx: cx, cy: cy, zone: zone };
            break;
        }

        if (!center) return { wanted: clusterSize, placed: 0 };

        var placedCount = 0;
        for (var s = 0; s < clusterSize; s++) {
            var shape = pick(CONFIG.shapes);
            var size = shape.size;
            var box = null;
            for (var b = 0; b < CONFIG.maxAttempts; b++) {
                var angle = Math.random() * Math.PI * 2;
                var dist = Math.random() * r;
                var x = center.cx + Math.cos(angle) * dist - size / 2;
                var y = center.cy + Math.sin(angle) * dist - size / 2;
                var candidate = boxFrom(x, y, size);
                if (candidate.left < CONFIG.margin || candidate.top < CONFIG.margin) continue;
                if (candidate.right > pageWidth - CONFIG.margin || candidate.bottom > pageHeight - CONFIG.margin) continue;
                if (!isAreaFree(map, candidate)) continue;
                box = candidate;
                break;
            }
            if (!box) continue;
            await addShape(map, box, shape.className);
            placedCount++;
        }

        reservedZones.push(center.zone);
        return { wanted: clusterSize, placed: placedCount };
    }

    async function placeLoneShape(pageWidth, pageHeight, map, reservedZones) {
        var shape = pick(CONFIG.shapes);
        var size = shape.size;
        for (var a = 0; a < CONFIG.maxAttempts; a++) {
            var x = randBetween(CONFIG.margin, pageWidth - CONFIG.margin - size);
            var y = randBetween(CONFIG.margin, pageHeight - CONFIG.margin - size);
            var box = boxFrom(x, y, size);
            if (overlapsAny(box, reservedZones)) continue;
            if (!isAreaFree(map, box)) continue;
            await addShape(map, box, shape.className);
            return true;
        }
        return false;
    }

    async function runScatter() {
        ensureLayer();
        layer.innerHTML = '';

        var pageWidth = document.documentElement.clientWidth;
        var pageHeight = document.body.scrollHeight;
        layer.style.height = pageHeight + 'px';

        var map = await buildObstacleMap(pageWidth, pageHeight);
        var reservedZones = [];

        var wanted = 0;
        var placed = 0;

        for (var c = 0; c < CONFIG.clusterCount; c++) {
            var result = await placeCluster(pageWidth, pageHeight, map, reservedZones);
            wanted += result.wanted;
            placed += result.placed;
        }

        for (var l = 0; l < CONFIG.loneCount; l++) {
            wanted += 1;
            if (await placeLoneShape(pageWidth, pageHeight, map, reservedZones)) placed += 1;
        }

        console.log('placed ' + placed + '/' + wanted);
    }

    function scatterDecor() {
        scatterChain = scatterChain.then(runScatter, runScatter);
        return scatterChain;
    }

    function init() {
        scatterDecor();
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(scatterDecor, 200);
        });
    }

    function whenReady() {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(init);
        } else {
            init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', whenReady);
    } else {
        whenReady();
    }

    window.scatterDecor = scatterDecor;
})();
