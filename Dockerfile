FROM node:8

ADD ./ /usr/blog-dependency
# Create app directory
WORKDIR /usr/blog-dependency

# RUN npm install
RUN npm install

WORKDIR /usr/blog

EXPOSE 4000

CMD [ "bash", "docker-bootstrap.sh" ]
