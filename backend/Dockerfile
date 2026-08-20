FROM public.ecr.aws/lambda/python:3.12

ENV MUJOCO_GL=disable

COPY requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY src/ ${LAMBDA_TASK_ROOT}/

CMD ["handler.handler"]
