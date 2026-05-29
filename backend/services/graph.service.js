import { getAllNotes } from './file-storage.service.js';
function extractWikiLinks(body) {
    const regex = /\[\[([^\]]+)\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
        links.push(match[1].trim());
    }
    return links;
}
export function getGraphData() {
    const notes = getAllNotes();
    const titleToId = new Map();
    notes.forEach(note => {
        titleToId.set(note.title.toLowerCase(), note.id);
    });
    const graphNodes = notes.map(note => ({
        id: note.id,
        title: note.title,
        tags: note.tags,
    }));
    const graphLinks = [];
    notes.forEach(note => {
        const wikiLinks = extractWikiLinks(note.body);
        wikiLinks.forEach(linkTitle => {
            const targetId = titleToId.get(linkTitle.toLowerCase());
            if (targetId) {
                graphLinks.push({
                    source: note.id,
                    target: targetId,
                    type: 'manual',
                });
            }
        });
    });
    return {
        nodes: graphNodes,
        links: graphLinks,
    };
}
export async function createNode(data, db) {
    const id = `node-${Date.now()}`;
    return {
        id,
        title: data.title,
        tags: data.tags,
    };
}
export async function updateNode(id, data, db) {
    return {
        id,
        title: data.title,
        tags: data.tags,
    };
}
export async function deleteNode(id, db) {
    return true;
}
export async function createEdge(data, db) {
    const id = `edge-${Date.now()}`;
    return {
        id,
        source: data.source,
        target: data.target,
        type: data.type,
    };
}
export async function deleteEdge(id, db) {
    return true;
}
