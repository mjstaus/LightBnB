SELECT city, SUM(reservations.id) AS total_reservations
  FROM properties
  JOIN reservations ON properties.id = property_id
  GROUP BY city
  ;