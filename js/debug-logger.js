(function(){
    if (window.__debugLoggerInstalled) return;
    window.__debugLoggerInstalled = true;

    const logs = [];
    let installed = false;
    let origMove = null;

    function snapshotDOMPositions() {
        const out = {};
        if (!window.ui || !ui.tiles) return out;
        ui.tiles.forEach((tile, idx) => {
            const rect = tile.getBoundingClientRect();
            out[idx] = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, flavor: tile.dataset.flavor || null };
        });
        return out;
    }

    function install() {
        if (!window.game || !window.ui) {
            console.error('debug-logger: game or ui not present on window');
            return;
        }
        if (installed) return;
        origMove = game.move.bind(game);

        game.move = function(direction){
            const beforeBoard = game.boardBefore ? game.boardBefore.slice() : game.board.slice();
            const beforeDOM = snapshotDOMPositions();
            const result = origMove(direction);

            // capture after state and DOM after animations settle
            const delay = 500; // ms - should be greater than slide+merge durations
            setTimeout(() => {
                const afterBoard = game.board.slice();
                const afterDOM = snapshotDOMPositions();
                const entry = { time: Date.now(), direction, beforeBoard, afterBoard, beforeDOM, afterDOM };
                logs.push(entry);
                console.groupCollapsed('debug-logger: move ' + direction + ' at ' + new Date(entry.time).toLocaleTimeString());
                console.log('beforeBoard', beforeBoard);
                console.log('afterBoard', afterBoard);
                console.log('beforeDOM', beforeDOM);
                console.log('afterDOM', afterDOM);
                console.groupEnd();
            }, delay);

            return result;
        };

        installed = true;
        console.info('debug-logger installed. Use startDebug()/stopDebug()/downloadLogs()');
    }

    function uninstall() {
        if (!installed) return;
        if (origMove) game.move = origMove;
        installed = false;
        console.info('debug-logger uninstalled');
    }

    function startDebug() {
        install();
        window.__debugLoggerRunning = true;
        console.info('debug-logger running');
    }

    function stopDebug() {
        window.__debugLoggerRunning = false;
        uninstall();
        console.info('debug-logger stopped');
    }

    function getLogs() { return logs.slice(); }

    function downloadLogs(filename = 'zevia-debug-logs.json') {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // expose to window
    window.debugLogger = {
        install,
        uninstall,
        startDebug,
        stopDebug,
        getLogs,
        downloadLogs
    };

    console.info('debug-logger ready. Call debugLogger.startDebug() to begin.');
})();
