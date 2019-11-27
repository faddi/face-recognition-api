import React from 'react';
// import logo from './logo.svg';
import './App.css';
import { Face } from './types';
import { Editor } from './Editor';
import * as math from 'mathjs';

const addr = 'ws://localhost:6789';

let socket = new WebSocket(addr);

const start = (onData: (data: any) => void) => {
  socket = new WebSocket(addr);
  socket.onopen = function(e) {
    console.log('[open] Connection established');
  };

  socket.onmessage = function(event) {
    // console.log(`[message] Data received from server`);
    const d = JSON.parse(event.data);
    onData(d);
  };

  socket.onclose = function(event) {
    if (event.wasClean) {
      console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log('[close] Connection died');
    }

    setTimeout(function() {
      start(onData);
    }, 5000);
  };

  socket.onerror = function(error) {
    console.log(`[error] ${JSON.stringify(error)}`);
  };
};

type KnownFacesObjType = { [key: string]: Face[] };

const STORAGE_KEY = 'known_faces';
const getKnownFacesFromStorage = (): KnownFacesObjType => {
  const known_faces_str = localStorage.getItem(STORAGE_KEY);

  if (known_faces_str === null) {
    return {};
  }

  try {
    return JSON.parse(known_faces_str);
  } catch (e) {
    console.log('parse error for ', known_faces_str);
    console.log(e);
    console.log('falling back to {}');

    return {};
  }
};

const faceDistance = (f1: Face, f2: Face): number => {
  const mf1 = math.matrix(f1.normed_embedding);
  const mf2 = math.matrix(f2.normed_embedding);

  const s = math.subtract(mf1, mf2);

  const d = math.norm(s as math.Matrix);

  return Number(d);
};

const calculateFaceDistances = (knownFaces: KnownFacesObjType, facelist: Face[]): { [key: string]: number[][] } => {
  const keys = Object.keys(knownFaces);

  let out: { [key: string]: number[][] } = {};

  for (const k of keys) {
    out[k] = knownFaces[k].map(f => {
      return facelist.map(f2 => {
        return faceDistance(f, f2);
      });
    });
  }

  return out;
};

const App: React.FC = () => {
  const [facelist, setFaceList] = React.useState<Face[]>([]);
  const [editFace, setEditFace] = React.useState<Face | null>(null);
  const [knownFaces, setKnownFaces] = React.useState<{ [key: string]: Face[] }>(getKnownFacesFromStorage());

  React.useEffect(() => {
    start(setFaceList);
  }, []);

  const handleAddFace = (nameIn: string, face: Face) => {
    console.log(nameIn, face);

    const name = nameIn.trim();

    if (name.length === 0) {
      console.log('invalid name');
      return;
    }

    const known = getKnownFacesFromStorage();

    if (name in known) {
      known[name].push(face);
    } else {
      known[name] = [face];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(known));
    setKnownFaces(known);
  };

  const handleDeleteKnownFace = (nameIn: string, index: number) => {
    console.log(nameIn, index);

    const name = nameIn.trim();

    if (name.length === 0) {
      console.log('invalid name');
      return;
    }

    const known = getKnownFacesFromStorage();

    known[name] = known[name].filter((_, i) => i !== index);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(known));
    setKnownFaces(known);
  };

  let f = facelist.map(face => {
    return (
      <div key={JSON.stringify(face.landmark)} onClick={() => setEditFace(face)} style={{ cursor: 'pointer' }}>
        <img alt="hello" src={'data:image/png;base64, ' + face.image_jpg} />
      </div>
    );
  });

  if (f.length === 0) {
    f = [<div key="empty">Nothing found in front of camera.</div>];
  }

  let editor = null;
  if (editFace !== null) {
    editor = (
      <Editor face={editFace} onSubmit={name => handleAddFace(name, editFace)} onCancel={() => setEditFace(null)} />
    );
  }

  let knownFacesList = [<div key="no">No known faces.</div>];
  const knownNames = Object.keys(knownFaces);
  if (knownNames.length > 0) {
    let allDistances: { [key: string]: number[][] } = {};
    if (facelist.length > 0) {
      allDistances = calculateFaceDistances(knownFaces, facelist);
    }

    knownFacesList = knownNames.map(name => {
      const faces = knownFaces[name];
      const personDistances = allDistances[name];

      const renderedFaces = faces.map((f, i) => {
        let distance = null;
        if (personDistances && personDistances.length > i) {
          const d = personDistances[i];

          distance = d.map((ds, faceindex) => {
            return { e: <span key={`${name}_${i}_${faceindex}`} style={{display: 'inline-block', padding: '0 10px'}}><img alt="w/e" src={'data:image/png;base64, ' + facelist[faceindex].image_jpg} />: {ds.toFixed(2)}</span>, ds: ds };
          });

          distance = distance.sort((a, b) => a.ds - b.ds).map(a => a.e);
        }

        return (
          <div key={`${name}_${i}`}>
            <img
              alt="hello"
              src={'data:image/png;base64, ' + f.image_jpg}
              onClick={() => handleDeleteKnownFace(name, i)}
              style={{ cursor: 'pointer' }}
            />
            {distance}
          </div>
        );
      });

      return (
        <div key={name}>
          <h4>{name}</h4>
          {renderedFaces}
        </div>
      );
    });
  }

  return (
    <div className="App">
      {editor}
      <div className="App-header">
        {knownFacesList}
        <hr />
        {f}
      </div>
    </div>
  );
};

export default App;
