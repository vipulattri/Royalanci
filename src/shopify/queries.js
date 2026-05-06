/**
 * Storefront API GraphQL documents.
 * @see https://shopify.dev/docs/api/storefront
 */

export const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCardFields on Product {
    id
    handle
    title
    vendor
    description(truncateAt: 320)
    tags
    featuredImage {
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 25) {
      edges {
        node {
          id
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export const COLLECTION_PRODUCTS = `
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first, after: $after, sortKey: BEST_SELLING) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            ...ProductCardFields
          }
        }
      }
    }
  }
`;

export const PRODUCTS_PAGINATED = `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductsPaginated($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...ProductCardFields
        }
      }
    }
  }
`;

export const PREDICTIVE_SEARCH = `
  query PredictiveSearch($query: String!, $limit: Int!, $types: [PredictiveSearchType!]) {
    predictiveSearch(query: $query, limit: $limit, types: $types) {
      products {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
      queries {
        text
      }
    }
  }
`;

export const PRODUCTS_SEARCH = `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductsSearch($first: Int!, $query: String!, $after: String) {
    products(first: $first, query: $query, sortKey: RELEVANCE) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...ProductCardFields
        }
      }
    }
  }
`;

export const CART_CREATE = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  image {
                    url
                    altText
                  }
                  product {
                    title
                    handle
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_LINES_ADD = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  image {
                    url
                    altText
                  }
                  product {
                    title
                    handle
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_GET = `
  query CartGet($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      totalQuantity
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                image {
                  url
                  altText
                }
                product {
                  title
                  handle
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_CREATE = `
  mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const CUSTOMER_ACCOUNT = `
  query CustomerAccount($customerAccessToken: String!, $ordersFirst: Int!, $ordersAfter: String) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      orders(first: $ordersFirst, after: $ordersAfter, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            name
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 15) {
              edges {
                node {
                  title
                  quantity
                  variantTitle
                }
              }
            }
          }
        }
      }
    }
  }
`;
