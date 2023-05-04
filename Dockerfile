FROM node:18-buster

WORKDIR /app

COPY package.json ./

RUN npm install --production

COPY . .

CMD ["npm", "start"]
