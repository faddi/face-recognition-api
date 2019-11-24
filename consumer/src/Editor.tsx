import React from 'react';
import { Face } from './types';

interface IEditorProps {
  face: Face;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const Editor: React.FC<IEditorProps> = props => {
  const [name, setName] = React.useState<string>('');

  return (
    <div>
      <div>
        <img alt="hello" src={'data:image/png;base64, ' + props.face.image_jpg} />
      </div>
      <div>
        Name: <input type="text" value={name} onChange={e => setName(e.currentTarget.value)} />
      </div>
      <div>
        <button onClick={() => props.onSubmit(name)}>Save</button>
        <button onClick={() => props.onCancel()}>Cancel</button>
      </div>
    </div>
  );
};
