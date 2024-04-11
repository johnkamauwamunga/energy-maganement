


// SELECT * FROM `routine_cashier` inner join cashier on routine_cashier.routine_cashier_id=cashier.cashier_id inner join routine_cashier_type on routine_cashier_type.type_routine_cashier_id=routine_cashier.routine_id inner join product_type on product_type.product_type_id=routine_cashier_type.product_type_id inner join product_classes on product_classes.product_type_id=product_type.product_type_id





app.post('/islandnonefuel', (req, res) => {
  const { selectedallocationpoints, selectedproductnames, quantity } = req.body;

  const island_id = selectedallocationpoints;
   const added = 10;
  const closing = 0;

  con.beginTransaction(async (err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    try {
      for (const product_id of selectedproductnames) {
        const lastClosingQuery = 'SELECT closing_stock AS last_closing FROM non_fuel_routine_sales WHERE product_name_id =? ORDER BY sales_id DESC LIMIT 1';
        const [lastClosingResult] = await con.query(lastClosingQuery, [product_id]);
        const lastClosing = lastClosingResult[0]?.last_closing || 0;

        const productQuantity = quantity[product_id];

        const openingStock = lastClosing + added;

        const insertQuery =
          'INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, closing_stock) VALUES (?, ?, ?, ?, ?)';

        await con.query(insertQuery, [product_id, island_id, lastClosing, added,openingStock, closing]);
      }

      con.commit((err) => {
        if (err) {
          console.log('Transaction commit failed:', err);
          return con.rollback(() => {
            res.status(500).json({ message: 'Registration failed' });
          });
        }
        console.log('Transaction committed.');
        return res.status(200).json({ message: 'Registration successful' });
      });
    } catch (error) {
      console.error('Error:', error);
      con.rollback(() => {
        res.status(500).json({ message: 'Registration failed' });
      });
    }
  });
});
// new 

app.post('/islandnonefuel', (req, res) => {
  const { selectedallocationpoints, selectedproductnames, quantity } = req.body;

  const island_id = selectedallocationpoints;
  const added = 10;
  const closing = 15;

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const insertProductData = (productIndex) => {
      if (productIndex >= selectedproductnames.length) {
        con.commit((err) => {
          if (err) {
            console.log('Transaction commit failed:', err);
            return con.rollback(() => {
              res.status(500).json({ message: 'Registration failed' });
            });
          }
          console.log('Transaction committed.');
          return res.status(200).json({ message: 'Registration successful' });
        });
        return;
      }

      const product_id = selectedproductnames[productIndex];
      const lastClosingQuery = 'SELECT closing_stock AS last_closing FROM non_fuel_routine_sales WHERE product_name_id =? ORDER BY sales_id DESC LIMIT 1';
      con.query(lastClosingQuery, [product_id], (error, lastClosingResult) => {
        if (error) {
          console.error('Error querying last closing stock:', error);
          con.rollback(() => {
            res.status(500).json({ message: 'Registration failed' });
          });
        } else {
          const lastClosing = lastClosingResult[0]?.last_closing || 0;
       //   const productQuantity = quantity[product_id];
          const openingStock = lastClosing + added;

          const insertQuery =
            'INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, closing_stock) VALUES (?, ?, ?, ?, ?)';

          con.query(insertQuery, [product_id, island_id, openingStock, added, closing], (error) => {
            if (error) {
              console.error('Error inserting new row:', error);
              con.rollback(() => {
                res.status(500).json({ message: 'Registration failed' });
              });
            } else {
              insertProductData(productIndex + 1); // Move to the next product
            }
          });
        }
      });
    };

    insertProductData(0); // Start inserting from the first product
  });
});

// cashier products type
app.post('/cashierpurchase', (req, res) => {
  const { selectedallocationpoints, selectedproductnames, quantity } = req.body;



  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const insertProductData = (productIndex) => {
      if (productIndex >= selectedproductnames.length) {
        con.commit((err) => {
          if (err) {
            console.log('Transaction commit failed:', err);
            return con.rollback(() => {
              res.status(500).json({ message: 'Registration failed' });
            });
          }
          console.log('Transaction committed.');
          return res.status(200).json({ message: 'Registration successful' });
        });
        return;
      }

      const product_id = selectedproductnames[productIndex];
      const lastClosingQuery = 'SELECT closing_stock AS last_closing FROM non_fuel_routine_sales WHERE product_name_id =? ORDER BY sales_id DESC LIMIT 1';
      con.query(lastClosingQuery, [product_id], (error, lastClosingResult) => {
        if (error) {
          console.error('Error querying last closing stock:', error);
          con.rollback(() => {
            res.status(500).json({ message: 'Registration failed' });
          });
        } else {
          const lastClosing = lastClosingResult[0]?.last_closing || 0;
       //   const productQuantity = quantity[product_id];
          const openingStock = lastClosing + added;

          const insertQuery =
            'INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, closing_stock) VALUES (?, ?, ?, ?, ?)';

          con.query(insertQuery, [product_id, island_id, openingStock, added, closing], (error) => {
            if (error) {
              console.error('Error inserting new row:', error);
              con.rollback(() => {
                res.status(500).json({ message: 'Registration failed' });
              });
            } else {
              insertProductData(productIndex + 1); // Move to the next product
            }
          });
        }
      });
    };

    insertProductData(0); // Start inserting from the first product
  });
});

