import cv2
import insightface as face
import numpy as np
# import redis
import json
import websockets
import logging
import asyncio
import threading
import base64
from typing import List
import insightface.model_zoo.face_recognition as fr
import insightface.model_zoo.model_zoo as mz
import time

mz._models['arcface_mfn_v1'] = fr.arcface_mfn_v1

# face.model_zoo._models['arcface_mfn_v1'] = fr.arcface_mfn_v1
# face.model_zoo._models['arcface_mfn_v1'] = face.arcface_mfn_v1

from insightface.app.face_analysis import Face
from time import sleep

logger = logging.getLogger('websockets.server')
logger.setLevel(logging.ERROR)
logger.addHandler(logging.StreamHandler())

USERS = set()

class NumpyEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return super(NumpyEncoder, self).default(obj)

async def register(websocket):
  logger.info('register user')
  USERS.add(websocket)

async def unregister(websocket):
  logger.info('unregister user')
  USERS.remove(websocket)

async def notify_users(msg):
    if USERS:  # asyncio.wait doesn't accept an empty list
        await asyncio.wait([user.send(msg) for user in USERS])

async def handler(websocket, path):
    logging.info('client connected')
    # register(websocket) sends user_event() to websocket
    await register(websocket)
    try:
        # await websocket.send(state_event())
        async for message in websocket:
            data = json.loads(message)
            # if data["action"] == "minus":
            #     STATE["value"] -= 1
            #     await notify_state()
            # elif data["action"] == "plus":
            #     STATE["value"] += 1
            #     await notify_state()
            # else:
            logging.error("unsupported event: {}", data)
    finally:
        await unregister(websocket)

def setup_ws():
  loop = asyncio.new_event_loop()
  asyncio.set_event_loop(loop)
  start_server = websockets.serve(handler, "localhost", 6789)
  print("ws server started")
  asyncio.get_event_loop().run_until_complete(start_server)
  asyncio.get_event_loop().run_forever()

t = threading.Thread(target=setup_ws, args=())
t.start()


# Get a reference to webcam #0 (the default one)
video_capture = cv2.VideoCapture(0)
video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 0)

# Initialize some variables
face_locations = []

model = face.app.FaceAnalysis(det_name='retinaface_mnet025_v2', rec_name='arcface_mfn_v1')
model.prepare(-1)

# r = redis.Redis(host='localhost', port=6379, db=0)

last_empty_sent = False
scale = 0.5

tick = 0

while True:

    if (time.time() - tick) < 0.5:
        ret = video_capture.grab()
        continue

    tick = time.time()

    # Grab a single frame of video
    ret, frame = video_capture.read()

    # if not USERS:
    #   continue

    if not ret:
      print("bad frame")
      continue

    # Resize frame of video to 1/4 size for faster face detection processing
    small_frame = cv2.resize(frame, (0, 0), fx=scale, fy=scale)

    ret: List[Face] = model.get(small_frame)

    # print(len(ret))
    # print(ret[0]._asdict().keys())

    s = scale
    f = frame
    faces = []

    for face in ret:
      # print(face.bbox)
      # print(face)
      # left, bottom, right, top = tuple(face.bbox)
      y1, x1, y2, x2 = tuple(face.bbox)

      y1 = max(0, int(y1))
      x1 = max(0, int(x1))
      y2 = max(0, int(y2))
      x2 = max(0, int(x2))

      sub = small_frame[x1:x2,  y1:y2]
      # print(sub)

      subr = cv2.resize(sub, (64, 64))
      subr_binary = cv2.imencode('.jpg', subr)[1]
      subr_base64 = base64.b64encode(subr_binary).decode('utf-8')

      # print(subr_base64[:80])

      face_dict = face._asdict()
      face_dict['image_jpg'] = subr_base64

      faces.append(face_dict)

      # cv2.imshow('Video', subr)

      # f1 = face.normed_embedding

      # # print(np.sum(np.square(f1 - faddi)))
      # # Scale back up face locations since the frame we detected in was scaled to 1/4 size
      # y2 = int(y2 * 1/s)
      # x2 = int(x2 * 1/s)
      # y1 = int(y1 * 1/s)
      # x1 = int(x1 * 1/s)

      # # Draw a box around the face
      # cv2.rectangle(f, (x1, y2), (x2, y1), (0, 0, 255), 2)

      # # sub = cv2[left:right, top:bottom]

      # # Draw a label with a name below the face
      # cv2.rectangle(f, (x1, y1 - 35), (x2, y1), (0, 0, 255), cv2.FILLED)
      # # font = cv2.FONT_HERSHEY_DUPLEX
      # # cv2.putText(f, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

    should_send = False

    if len(faces) > 0:
      should_send = True
      last_empty_sent = False
    elif last_empty_sent == False:
      should_send = True
      last_empty_sent = True

    if should_send:
      s = json.dumps(faces, cls=NumpyEncoder)
      loop = asyncio.get_event_loop()
      p = notify_users(s)
      loop.run_until_complete(p)

    # Display the resulting image
    # cv2.imshow('Video', frame)

    # Hit 'q' on the keyboard to quit!
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release handle to the webcam
video_capture.release()
cv2.destroyAllWindows()
