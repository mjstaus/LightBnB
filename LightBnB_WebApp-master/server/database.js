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
  return pool
    .query(
      `
      SELECT * FROM users
      WHERE email = $1`,
      [email]
    )
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
  return pool
    .query(
      `
      SELECT * FROM users
      WHERE id = $1`,
      [id]
    )
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
const addUser = function (user) {
  return pool
    .query(
      `
    INSERT INTO users (
      name, email, password) 
      VALUES (
      $1, $2, $3)
      RETURNING *;`,
      [user.name, user.email, user.password]
    )
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
const getAllReservations = function (guest_id, limit = 10) {
  return pool
    .query(
      `
  SELECT reservations.id, properties.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN users ON reservations.guest_id = users.id
  WHERE users.id = $1
  ORDER BY start_date
  LIMIT 10;`,
      [guest_id]
    )
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

  const joinConditions = () => {
    if (!queryParams.length) {
      queryString += `WHERE `;
    } else {
      queryString += ` AND `;
    }
  };

  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    joinConditions();
    queryParams.push(`%${options.city}%`);
    queryString += `city LIKE $${queryParams.length}`;
  }
  if (options.user_id) {
    joinConditions();
    queryParams.push(`%${options.user_id}%`);
    queryString += `user_id = $${queryParams.length}`;
  }
  if (options.minimum_price_per_night) {
    joinConditions();
    queryParams.push(`${options.minimum_price_per_night}`);
    queryString += `(cost_per_night/100) >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    joinConditions();
    queryParams.push(`${options.maximum_price_per_night}`);
    queryString += `(cost_per_night/100) <= $${queryParams.length}`;
  }

  queryParams.push(limit);

  console.log(queryParams);

  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
  const queryParams = [];
  const values = [];
  //push each property if options.property
  //iterate over final queryParams to create values list
  //use .join() method to join properties from array to string (set to new variable properties)

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
  console.log(queryValues);

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
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.addProperty = addProperty;
