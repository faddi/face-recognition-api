import React from 'react';
import logo from './logo.svg';
import './App.css';

const addr = "ws://localhost:6789";

let socket = new WebSocket(addr);

const start = (onData: (data: any) => void) => {
  socket = new WebSocket(addr)
  socket.onopen = function(e) {
    console.log("[open] Connection established");
  };

  socket.onmessage = function(event) {
    // console.log(`[message] Data received from server`);
    const d = JSON.parse(event.data)
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

    setTimeout(function(){start(onData)}, 5000);
  };

  socket.onerror = function(error) {
    console.log(`[error] ${JSON.stringify(error)}`);
  };
}

interface Face {
  age: number;
  bbox: [number, number, number, number];
  det_score: number;
  embedding: number[]
  embedding_norm: number[]
  gender: number;
  image_jpg: string;
  landmark: number[][];
  normed_embedding: number;
}

const App: React.FC = () => {

  const [facelist, setFaceList] = React.useState<Face[]>([]);

  React.useEffect(() => {
    start(setFaceList)
  }, []);

  let f = facelist.map(face => {
    return <div key={JSON.stringify(face.landmark)}><img alt="hello" src={'data:image/png;base64, ' + face.image_jpg} /></div>
  })

  if (f.length === 0) {
    f = [<div key="empty">Nothing found...</div>]
  }



  return (
    <div className="App">
      <header className="App-header">
        {f}
      </header>
    </div>
  );
}

export default App;
