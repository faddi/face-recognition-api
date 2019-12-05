import mxnet as mx
import tvm
import tvm.relay as relay
from tvm.contrib import util
import numpy as np
from tvm import rpc

local_demo = True

if local_demo:
    remote = rpc.LocalSession()
else:
    # The following is my environment, change this to the IP address of your target device
    host = '192.168.1.141'
    port = 9090
    remote = rpc.connect(host, port)


prefix,epoch = "det_model",0
mx_sym, args, auxs = mx.model.load_checkpoint(prefix, epoch)
image_size = (224, 224)
opt_level = 3

shape_dict = {'data': (1, 3, *image_size)}
target = tvm.target.create("llvm")
# "target" means your target platform you want to compile.

# mx_sym, args, auxs = mx.model.load_checkpoint('resnet18_v1', 0)
# now we use the same API to get Relay computation graph
mod, relay_params = relay.frontend.from_mxnet(mx_sym, shape_dict,
                                              arg_params=args, aux_params=auxs)
# print(relay_params)

# func = mod["main"]
func = mod

with relay.build_config(opt_level=3):
    graph, lib, params = relay.build(func, target, params=relay_params)

# print(func)
# print(graph)
# print(lib.get_source())
# print(params)

temp = util.tempdir()
path = temp.relpath('lib.tar')
lib.export_library(path)

print(f"local_demo: {local_demo} path: {path}")

# exec

######################################################################
# Upload the lib to the remote device, then invoke a device local
# compiler to relink them. Now `func` is a remote module object.

remote.upload(path)
func = remote.load_module('lib.tar')

ctx = remote.cpu()
a = tvm.nd.array(np.random.rand(1, 3, 224, 224).astype('float32'), ctx)
print(a)
print(a.shape)
# b = tvm.nd.array(np.zeros(1024, dtype=A.dtype), ctx)
# the function will run on the remote device
func(a)
# np.testing.assert_equal(b.asnumpy(), a.asnumpy() + 1)



