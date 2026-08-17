/**
 * Dijkstra's shortest path algorithm for taxiway graphs
 */
const Dijkstra = {
    /**
     * Find shortest path between two nodes in a graph
     * @param {Object} graph - adjacency list: { nodeId: { neighborId: weight, ... }, ... }
     * @param {string} start
     * @param {string} end
     * @returns {Array|null} - array of node IDs forming the path, or null if no path
     */
    findPath(graph, start, end) {
        if (start === end) return [start];

        const distances = {};
        const previous = {};
        const visited = new Set();
        const queue = [];

        // Initialize distances
        for (const node in graph) {
            distances[node] = Infinity;
        }
        distances[start] = 0;

        queue.push({ id: start, dist: 0 });

        while (queue.length > 0) {
            // Sort by distance and pick closest unvisited
            queue.sort((a, b) => a.dist - b.dist);
            const current = queue.shift();

            if (visited.has(current.id)) continue;
            visited.add(current.id);

            if (current.id === end) {
                // Reconstruct path
                return this._reconstructPath(previous, end);
            }

            const neighbors = graph[current.id];
            if (!neighbors) continue;

            for (const neighborId in neighbors) {
                const weight = neighbors[neighborId];
                const dist = distances[current.id] + weight;

                if (!distances.hasOwnProperty(neighborId)) {
                    distances[neighborId] = Infinity;
                }

                if (dist < distances[neighborId]) {
                    distances[neighborId] = dist;
                    previous[neighborId] = current.id;
                    queue.push({ id: neighborId, dist });
                }
            }
        }

        return null; // No path found
    },

    _reconstructPath(previous, node) {
        const path = [node];
        let current = node;
        while (previous[current] !== undefined) {
            current = previous[current];
            path.unshift(current);
        }
        return path;
    }
};
