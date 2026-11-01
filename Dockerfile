FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY lib ./lib
COPY scripts/whacka_products.json scripts/store_product_images.json ./scripts/
COPY assets/store-products ./assets/store-products
COPY products_config.js store_data.js worker.js ./
USER node
CMD ["node", "worker.js"]
