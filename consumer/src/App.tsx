import React from 'react';
// import logo from './logo.svg';
import './App.css';
import { Face } from './types';
import { Editor } from './Editor';

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

const STORAGE_KEY = 'known_faces';
const getKnownFacesFromStorage = (): { [key: string]: Face[] } => {
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
    knownFacesList = knownNames.map(name => {
      const faces = knownFaces[name];

      const renderedFaces = faces.map((f, i) => {
        return <img key={`${name}_${i}`} alt="hello" src={'data:image/png;base64, ' + f.image_jpg} />;
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
