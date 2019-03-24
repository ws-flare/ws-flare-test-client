FROM node:8-alpine AS build

COPY . ./app

WORKDIR ./app

RUN yarn --production --ignore-engines

RUN rm yarn.lock && rm .yarnclean

FROM alpine AS prod

RUN apk add nodejs-lts

COPY --from=build /app .

CMD ["node", ".", "–nouse-idle-notification", "–max-old-space-size=8192", "–max-new-space-size=2048"]
