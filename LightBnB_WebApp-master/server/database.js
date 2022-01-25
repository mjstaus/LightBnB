require("dotenv").config();
const pool = require("./db_connection");

///// USERS /////
////////////////

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = (email) => {
  const queryText = `
    SELECT * FROM users
      WHERE email = $1;`;

  const queryValues = [email];

  const query = {
    text: queryText,
    values: queryValues,
  };

  return pool
    .query(query)
    .then((result) => {
      if (result.rowCount >= 1) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  const queryText = `
    SELECT * FROM users
      WHERE id = $1;`;

  const queryValues = [id];

  const query = {
    text: queryText,
    values: queryValues,
  };

  return pool
    .query(query)
    .then((result) => {
      if (result.rowCount >= 1) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryText = `
    INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3)
      RETURNING *;`;

  const queryValues = [user.name, user.email, user.password];

  const query = {
    text: queryText,
    values: queryValues,
  };

  return pool
    .query(query)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

///// RESERVATIONS //////
////////////////////////
/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryText = `
  SELECT reservations.id, properties.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN users ON reservations.guest_id = users.id
  WHERE users.id = $1
  ORDER BY start_date
  LIMIT 10;`;

  const queryValues = [guest_id];

  const query = {
    text: queryText,
    values: queryValues,
  };

  return pool
    .query(query)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllReservations = getAllReservations;


///// PROPERTIES //////
//////////////////////
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  const conditions = [];

  const joinConditions = (conditions) => {
    for (const condition of conditions) {
      if (condition === conditions[0]) {
        queryText += `WHERE ${condition}`;
      } else {
        queryText += ` AND ${condition}`;
      }
    }
  };

  let queryText = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    conditions.push(`city LIKE $${queryParams.length}`);
  }
  if (options.user_id) {
    queryParams.push(`%${options.user_id}%`);
    conditions.push(`user_id = $${queryParams.length}`);
  }
  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night}`);
    conditions.push(`(cost_per_night/100) >= $${queryParams.length}`);
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night}`);
    conditions.push(`(cost_per_night/100) <= $${queryParams.length}`);
  }

  joinConditions(conditions);

  queryText += `GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryText += ` HAVING AVG(property_reviews.rating) >= $${queryParams.length}`;
  }

  queryParams.push(limit);

  queryText += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

  const query = {
    text: queryText,
    values: queryParams,
  };

  return pool
    .query(query)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function(property) {
  const queryParams = [];
  const values = [];

  const propertyProps = [
    "owner_id",
    "title",
    "description",
    "thumbnail_photo_url",
    "cover_photo_url",
    "cost_per_night",
    "street",
    "city",
    "province",
    "post_code",
    "country",
    "parking_spaces",
    "number_of_bathrooms",
    "number_of_bedrooms",
  ];

  for (let prop of propertyProps) {
    if (property[prop]) {
      queryParams.push(prop);
      values.push(`$${queryParams.length}`);
    }
  }

  const queryParamsString = queryParams.join();
  const valuesString = values.join();

  const queryValues = queryParams.map((param) => property[param]);

  const queryText = `
    INSERT INTO properties (${queryParamsString})
    VALUES (${valuesString})
    RETURNING *;`;

  const query = {
    text: queryText,
    values: queryValues,
  };

  return pool
    .query(query)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.addProperty = addProperty;
