FROM public.ecr.aws/lambda/python:3.12

# OSMesa provides the off-screen OpenGL implementation MuJoCo's renderer
# uses (task 006/008); Amazon Linux base uses dnf, not apt.
RUN dnf install -y mesa-libOSMesa mesa-libOSMesa-devel mesa-libGL mesa-libEGL && \
    dnf clean all

# MUJOCO_GL must be set before the mujoco module is imported, so it is set
# at the container/process level rather than from within Python.
ENV MUJOCO_GL=osmesa

COPY requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY src/ ${LAMBDA_TASK_ROOT}/

CMD ["handler.handler"]
