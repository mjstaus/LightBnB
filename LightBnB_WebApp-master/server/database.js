require("dotenv").config();
const { options } = require("request");
const pool = require("./db_connection");
const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

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

/// Reservations

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

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  
  const queryParams = [];

  let queryText = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  const joinConditions = () => {
    if (!queryParams.length) {
      queryText += `WHERE `;
    } else {
      queryText += ` AND `;
    }
  };

  if (options.city) {
    joinConditions();
    queryParams.push(`%${options.city}%`);
    queryText += `city LIKE $${queryParams.length}`;
  }
  if (options.user_id) {
    joinConditions();
    queryParams.push(`%${options.user_id}%`);
    queryText += `user_id = $${queryParams.length}`;
  }
  if (options.minimum_price_per_night) {
    joinConditions();
    queryParams.push(`${options.minimum_price_per_night}`);
    queryText += `(cost_per_night/100) >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    joinConditions();
    queryParams.push(`${options.maximum_price_per_night}`);
    queryText += `(cost_per_night/100) <= $${queryParams.length}`;
  }

  queryParams.push(limit);

  console.log(queryParams);

  queryText += `
    GROUP BY properties.id
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
