const express = require ('express');
const mysql = require ('mysql');
const cors = require ('cors');
const bodyParser = require('body-parser');
const moment = require('moment');
const session=require('express-session');
const cookieParser=require('cookie-parser');
const jwt=require('jsonwebtoken');

const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json())
app.use(cookieParser());
app.use(cors());

//database connection 


const con = mysql.createConnection({
      host : 'localhost',
      user : 'root',
      password : '',
      database : 'texas'
})



// login 
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(username+'hey yo'+password);
  const sql = 'SELECT * From login inner join supervisor on login.login_id=supervisor.supervisor_login_id inner join supervisor_allocation on supervisor_allocation.allocation_supervisor_id=supervisor.supervisor_id inner join station on station.station_id=supervisor_allocation.allocation_station_id WHERE (login_username = ? OR login_email = ?) AND login_password = ?';
  const values = [username,username, password];

  con.query(sql, values, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    //jwt authentication
    console.log('username ',results[0].login_username,'\n password ',results[0].login_password)
    const payload = {
    id: results[0].login_username.login_id,
    supervisor_id:results[0].supervisor_id,
    station_id:results[0].station_id,
    station_name:results[0].station_name,
    username: results[0].login_username, // Include the username
    rank: results[0].login_rank,
    };

    jwt.sign(payload, 'shh', { expiresIn: '10h' }, (err, token) => {
      res.json({
        token:token,
        id: results[0].login_username.login_id,
        supervisor_id:results[0].supervisor_id,
    station_id:results[0].station_id,
    station_name:results[0].station_name,
      username: results[0].login_username,
      rank: results[0].login_rank,
      });
    });
  
    //to here

    // return res.json({ success: true, message: 'Login successful', username:username });
 //return res.json({Login:true })
  });
});
//. end login



function verifyToken(req, res, next){
  const bearerHeader=req.headers['authorization'];
  if(typeof bearerHeader !=='undefined'){
      const bearer=bearerHeader.split(' ');
      const bearerToken=bearer[1];

      req.token=bearerToken;
      next();
  }
  else{
      res.sendStatus(403);
  }
}

//end jwt connections

//create user
app.post('/createuser', (req, res) => {
  const { firstname, lastname, phone, email, idnumber, rank, staffid, password } = req.body;
const username = firstname + lastname;
 
  if (!firstname || !lastname || !email || !username || !password || !rank||!phone||!idnumber) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  //console.log(firstname, lastname, email, phone,rank,national_id,location, username, password);
  console.log(req.body.rank);
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }
    const ranker=req.body.rank;

    const rank=ranker.toLowerCase()

    const loginSql = 'INSERT INTO `login`(`login_username`, `login_email`, `login_password`, `login_rank`) VALUES (?,?,?,?)';
    con.query(loginSql, [firstname, email, password, rank], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register (login):', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
      }
      
      const loginId = loginResult.insertId;
     
// output: "dogs are better than cats."

      // Determine the table based on login_rank
      let registerSql;
      let registerParams;
      if (rank === 'admin') {
        registerSql = 'INSERT INTO `admin`(`admin_first_name`, `admin_last_name`, `admin_email`, `admin_phone`, `admin_national_id`, `admin_staff_id`, `admin_login_id`) VALUES (?,?,?,?,?,?,?)';
        registerParams = [firstname, lastname,email,phone,idnumber,staffid, loginId];
      } else if (req.body.rank === 'supervisor' || req.body.rank ===  'Supervisor' || req.body.rank ===  'SUPERVISOR') {
        registerSql = 'INSERT INTO `supervisor`(`supervisor_first_name`, `supervisor_last_name`, `supervisor_email`, `supervisor_phone`, `supervisor_national_id`, `supervisor_staff_id`, `supervisor_login_id`) VALUES (?,?,?,?,?,?,?)';
        registerParams = [firstname, lastname, email,phone,idnumber,staffid, loginId];
      }else if (req.body.rank === 'superadmin' || req.body.rank ===  'Superadmin' || req.body.rank ===  'SUPERADMIN') {
        registerSql = 'INSERT INTO `superadmin`(`admin_first_name`, `last_name`, `admin_email`, `admin_phone`, `admin_staff_id`, `admin_login_id`) VALUES (?,?,?,?,?,?)';
        registerParams = [firstname, lastname, email,phone,staffid,loginId];
      }
       else {
        // Invalid rank
        con.rollback(() => {
          console.log('Invalid rank:', rank);
          return res.status(400).json({ message: 'Invalid rank' });
        });
      }
      

      con.query(registerSql, registerParams, (registerErr, registerResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to register (register):', registerErr);
            return res.status(500).json({ message: 'Registration failed' });
          });
        }

        con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
        });
      });
    });
  });

});
//. end create users




// crreate invoice sales
app.post('/createinvoice', (req, res) => {
  console.log('tapped');
  const {selectedsupervisors,selectedcustomers, vehicle,kilometer,order,invoiceno,dept,finaldate,drivername, driverid,driverphone,selectedcashiers,selectedserved,stockstore,selecteditems,quantity,price,basicamount,amount,discount,gross, vat,lntotal,inventorytotal,island,shift,stock,stationId} = req.body;

 
  console.log(selectedsupervisors+' : selected cust :'+selectedcustomers+' : veh :'+ vehicle+' : kms :'+kilometer+' : order  :'+order+' : invno :'+invoiceno+' : dept :'+dept+' : fin date:'+finaldate+' : driver :'+drivername+' : dr id :'+ driverid+' : dr phone :'+driverphone+' : cashier is:'+selectedcashiers+' ::'+selectedserved+' ::'+stockstore+' ::'+selecteditems+' ::'+quantity+' ::'+price+' ::'+basicamount+' ::'+amount+' ::'+discount+' ::'+gross+' : vat :'+vat+' : ln total:'+lntotal+' : inv total :'+inventorytotal+' : island :'+island+' : shift :'+shift,)
  // if (!pumpid || !meterdesc ) {
  //   return res.status(400).json({ message: 'Invalid registration data' });
  // }
 const itemId=parseInt(selecteditems);
 const  stockamt=parseInt(stock);
  const finquantity=parseInt(quantity);

  const newstock=stockamt-finquantity;
  
  const sales_desc='Invoice sales'
  
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const salesSql = 'SELECT * FROM `sales_desc` WHERE sales_desc=?';
    con.query(salesSql, [sales_desc], (loginErr, salesResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('sales decription failure:', loginErr);
          return res.status(500).json({ message: 'sales decription failure' });
        });
 
     }
      const salesId = salesResult[0].sales_desc_id;
      console.log('salesId', salesId);
  //     // from here
  const invoiceSql = 'INSERT INTO `sales`(`sales_date`, `sales_product_id`,`VAT`, `sales_quantity`, `sales_price`, `sales_desc_id`, `sales_shift_id`, `routine_cashier`, `served_by`, `island_id`,`total_amount`,`station_id`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
  ///const {selectedsupervisors,selectedcustomers, vehicle,kilometer,order,invoiceno,dept,finaldate,drivername, driverid,driverphone,selectedcashiers,servedby,stockstore,selecteditems,quantity,price,basicamount,amount,discount,gross, vat,lntotal,inventorytotal,island,shift,} = req.body;
      con.query(invoiceSql, [finaldate, selecteditems,vat,quantity,price,salesId,shift,selectedcashiers,selectedserved,island,lntotal,stationId], (loginErr, invoiceResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to perform invoce sales:', loginErr);
            return res.status(500).json({ message: 'invoice sales failed' });
        });
      }

  //     //second qry
  const actualsalesId = invoiceResult.insertId;

  console.log('actualsalesid ',actualsalesId);

  const salesSql = 'INSERT INTO `invoice_sales_details`(`vehicle_reg_no`, `customer_id`, `invoice_no`, `sales_desc_id`, `actual_sales_id`) VALUES(?,?,?,?,?)';
  con.query(salesSql, [vehicle,selectedcustomers,invoiceno,salesId,actualsalesId], (loginErr, salesResult) => {
    if (loginErr) {
      con.rollback(() => {
        console.log('invoice sales details failure:', loginErr);
        return res.status(500).json({ message: 'invoice sales details failure' });
      });

   }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('sales successful');
          return res.status(200).json({ message: 'sales successful' });
    });
      //second qry
    });
      // to here
  });
      
  });
  });
});

// create invoice sales



// crreate creditsales sales
app.post('/creditsale', (req, res) => {
  console.log('tapped');

  const {selectedcashiers, selectedsupervisors, selecteditems, selectedserved, finaldate, vehicleno, cardholder, receiptno, cardno, qty, price, basic, amt,discamt, vatrate, gross, qtystock,shift,island,stationId }=req.body;
 
  console.log(selectedcashiers,' ', selectedsupervisors,' ', selecteditems,' ', selectedserved,' ',finaldate,' ',vehicleno,' ',cardholder,' ',receiptno,' ',cardno,' ',qty,' ',price,' ',basic,' ',amt,' ',discamt,' ',vatrate,' ',gross,' ',qtystock,' ',shift,' ',island)
//   console.log(selectedsupervisors+' ::'+selectedcustomers+' ::'+ vehicle+' ::'+kilometer+' ::'+order+' ::'+invoiceno+' ::'+dept+' ::'+finaldate+' ::'+drivername+' ::'+ driverid+' ::'+driverphone+' ::'+selectedcashiers+' ::'+servedby+' ::'+stockstore+' ::'+selecteditems+' ::'+quantity+' ::'+price+' ::'+basicamount+' ::'+amount+' ::'+discount+' ::'+gross+' ::'+vat+' ::'+lntotal+' ::'+inventorytotal+' ::'+island+' ::'+shift,)
//   // if (!pumpid || !meterdesc ) {
//   //   return res.status(400).json({ message: 'Invalid registration data' });
//   // }
  const itemId=parseInt(selecteditems);
//  const  stockamt=parseInt(stock);
//   const finquantity=parseInt(quantity);

//   const newstock=stockamt-finquantity;
  
   const sales_desc='Credit Sales'
  
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const salesSql = 'SELECT * FROM `sales_desc` WHERE sales_desc=?';
    con.query(salesSql, [sales_desc], (loginErr, salesResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('sales decription failure:', loginErr);
          return res.status(500).json({ message: 'sales decription failure' });
        });
 
     }
      const salesId = salesResult[0].sales_desc_id;

      console.log('salesid ',salesId)
  //     // from here
       const creditSql = 'INSERT INTO `sales`(`sales_date`, `sales_product_id`,`VAT`, `sales_quantity`, `sales_price`, `sales_desc_id`, `sales_shift_id`, `routine_cashier`, `served_by`, `island_id`,`total_amount`,`station_id`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
 // const {selectedsupervisors,selectedcustomers, vehicle,kilometer,order,invoiceno,dept,finaldate,drivername, driverid,driverphone,selectedcashiers,servedby,stockstore,selecteditems,quantity,price,basicamount,amount,discount,gross, vat,lntotal,inventorytotal,island,shift,} = req.body;
      con.query(creditSql, [finaldate, selecteditems,vatrate,qty,price,salesId,shift,selectedcashiers,selectedserved,island,amt,stationId], (loginErr, creditResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to perform invoce sales:', loginErr);
            return res.status(500).json({ message: 'invoice sales failed' });
        });
      }

//   //
// sales specificd details

      
const actualsalesId = creditResult.insertId;

const detailsSql = 'INSERT INTO `credit_sale_details`( `vehicle_reg_no`, `receipt_no`, `card_no`, `card_holder`, `sales_desc_id`, `actual_sales_id`) VALUES(?,?,?,?,?,?)';
con.query(detailsSql, [vehicleno,receiptno,cardno,cardholder,salesId,actualsalesId], (loginErr, detailsResult) => {

  if (loginErr) {
    con.rollback(() => {
      console.log('Sales details not inserted:', loginErr);
      return res.status(500).json({ message: 'Sales details not inserted'});
  });
}

//second qry

  // const salesSql = 'UPDATE `stock` SET `stock_capacity`=? where`stock_product_id`=?';
  // con.query(salesSql, [newstock,itemId], (loginErr, salesResult) => {
  //   if (loginErr) {
  //     con.rollback(() => {
  //       console.log('stock update failure:', loginErr);
  //       return res.status(500).json({ message: 'stock update failure' });
  //     });

  //  }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('sales successful');
          return res.status(200).json({ message: 'sales successful' });
    });
      //second qry
   // });
      // to here
});
      //end sales specific details
  });
      
  });
  });
});

// create credit sales


// create vendors
app.post('/createvendor', (req, res) => {
  const {vendorname, vendorphone, vendoremail, vendoraddress, vendorpin, vendoraccountno  } = req.body;
 
 // console.log('hello johny')
  if (!vendorname || !vendorphone || !vendoremail || !vendoraddress || !vendorpin || !vendoraccountno) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  console.log(vendorname, vendorphone, vendoremail, vendoraddress, vendorpin, vendoraccountno );
//   console.log(req.body.rank);
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }
   
    

    const vendorSql = 'INSERT INTO `vendor`( `vendor_name`, `vendor_mobile`, `vendor_email`, `vendor_address`, `vendor_pin`)  VALUES (?,?,?,?,?)';
    con.query(vendorSql, [vendorname, vendorphone, vendoremail, vendoraddress, vendorpin], (loginErr, vendorResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register (login):', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
      }
      
      const vendorId = vendorResult.insertId;
     
// output: "dogs are better than cats."

      // Determine the table based on login_rank
      let vendorAccSql;
      let registerParams;
      
        vendorAccSql = 'INSERT INTO `vendor_account`( `vendor_acc_vendor_id`, `vendor_acc_no`) VALUES (?,?)';
        registerParams = [vendorId, vendoraccountno];
      

      con.query(vendorAccSql, registerParams, (registerErr, registerResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to register (register):', registerErr);
            return res.status(500).json({ message: 'Registration failed' });
          });
        }

        con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
        });
      });
    });
  });

});

/// end create vendors

//register Customers
app.post('/createcustomers', (req, res) => {
  const { customername, customeraccountno} = req.body;

 
  if (!customername || !customeraccountno ) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  //console.log(tankcode);
  
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const loginSql = 'INSERT INTO `customers`( `customer_name`, `customer_account_no`) VALUES (?,?)';
    con.query(loginSql, [customername, customeraccountno], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register customer:', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
 
      }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Customer Registration successful');
          return res.status(200).json({ message: 'Customer Registration successful' });
    });
  });
  });
});

//. end register Customers

//register tanks
app.post('/createtank', (req, res) => {
  const { tankcode, tankcapacity} = req.body;

 
  if (!tankcode || !tankcapacity ) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  //console.log(tankcode);
  
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const loginSql = 'INSERT INTO `tank`(`tank_code`, `tank_capacity`) VALUES (?,?)';
    con.query(loginSql, [tankcode, tankcapacity], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register tank:', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
 
      }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
    });
  });
  });
});

//. end register tanks

//register pump
app.post('/createpump', (req, res) => {
  const { pumpcode} = req.body;

 
  if (!pumpcode ) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  
  console.log('tapped');
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const loginSql = 'INSERT INTO `pump`(`pump_code`) VALUES (?)';
    con.query(loginSql, [pumpcode], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register pump:', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
 
      }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
    });
  });
  });
});
//.end register pumps

//register meter
app.post('/createmeter', (req, res) => {
  const {pumpid, meterdesc} = req.body;

 
  if (!pumpid || !meterdesc ) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  
  console.log('tapped');
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const loginSql = 'INSERT INTO `meter`(`meter_pump_id`) VALUES (?)';
    con.query(loginSql, [pumpid], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register pump:', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
 
      }
      const loginId = loginResult.insertId;
      // from here
      const loginSql = 'INSERT INTO `meter_desc`(`meter_desc_`, `meter_desc_meter_id`) VALUES (?,?)';
      con.query(loginSql, [meterdesc, loginId], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to register pump:', loginErr);
            return res.status(500).json({ message: 'Registration failed' });
        });
      }

      //second qry

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
    });
      //second qry
    });
      // to here

      
  });
  });
});

//end create meter

//register station
app.post('/createstation', (req, res) => {
  const { stationname, locationname,phone, email} = req.body;

 
  if (!stationname || !locationname ||!phone || !email ) {
    return res.status(400).json({ message: 'Invalid registration data' });
  }
  
  console.log('tapped');
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const loginSql = 'INSERT INTO `station`( `station_name`, `station_location`,`station_phone`, `station_email`) VALUES (?,?,?,?)';
    con.query(loginSql, [stationname, locationname,phone, email], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register tank:', loginErr);
          return res.status(500).json({ message: 'Registration failed' });
        });
 
      }

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Registration failed' });
            });
          }

          console.log('Registration successful');
          return res.status(200).json({ message: 'Registration successful' });
    });
  });
  });
});

//. end register station

//fuel sales
//SELECT * FROM `routine_islandpump_cashier` inner join routine_cashier on routine_islandpump_cashier.cashier_routine_id=routine_cashier.routine_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join pump_routine on pump_routine.pump_routine_id=routine_islandpump_cashier.pump_routine_id inner join pump on pump.pump_id=pump_routine.

// RECONCILLIATION
//NB- the shift id is gonna be based on the last sghift.. //cmheck on shift crteation as its global in here
//  view pumps
// app.get('/viewroutinesales', (req, res) => {
//   const sql = 'SELECT DISTINCT * FROM `non_fuel_routine_sales` inner join routine_island on non_fuel_routine_sales.sales_island_routine_id=routine_island.routine_id inner join product_name on non_fuel_routine_sales.product_name_id=product_name.product_item_id inner join product_classes on product_name.product_item_class_id=product_classes.product_class_id inner join product_type on product_type.product_type_id=product_classes.product_type_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join shift on shift.shift_id=routine_island.routine_shift_id INNER Join product_price on product_price.price_product_id=product_name.product_item_id inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=routine_island.routine_id WHERE shift.shift_id=19 order by non_fuel_routine_sales.product_name_id';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });

app.get('/viewroutinesales', (req, res) => {
  // Select final shift to get its ID

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT DISTINCT * FROM `non_fuel_routine_sales` inner join allocation_point on non_fuel_routine_sales.sales_island_routine_id=allocation_point.allocation_point_id inner join product_name on non_fuel_routine_sales.product_name_id=product_name.product_item_id inner join product_classes on product_name.product_item_class_id=product_classes.product_class_id inner join product_type on product_type.product_type_id=product_classes.product_type_id INNER Join product_price on product_price.price_product_id=product_name.product_item_id inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=allocation_point.allocation_point_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join shift on shift.shift_id=routine_cashier.routine_shift_id WHERE non_fuel_routine_sales.shift_id=? and shift.shift_id=? order by non_fuel_routine_sales.product_name_id';
    con.query(routineSql, [lastShiftId,lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});
//. end view pumps

//...............................................................trial....................................................................................

//................................................................trial........................................................................................
// fuelfocourt sales
// NB- the shift id is gonna be based on the last sghift.. //cmheck on shift crteation as its global in here
//  view pumps
app.get('/viewfuelsales', (req, res) => {

  
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }
  
      // Check if there are any shift records
      if (shiftResults.length === 0) {
        return res.json({ error: 'No shift records found' });
      }
  
      // Get the ID of the last shift
      const lastShiftId = shiftResults[0].shift_id;
  
     // return res.json('last shift id '+lastShiftId);
  

  const routineSql = 'SELECT * FROM `routine_islandpump_cashier` inner join pump on routine_islandpump_cashier.pump_routine_id=pump.pump_id inner join pump_island on pump_island.pump_id=pump.pump_id inner join routine_cashier on routine_cashier.routine_id=routine_islandpump_cashier.cashier_routine_id inner join shift on shift.shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=pump_island.island_id inner join tank_pump on pump.pump_id=tank_pump.pump_id inner join tank on tank.tank_id=tank_pump.tank_id where shift_id=?';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view pumps

// TRECONCILLIATION

//  view pumps
app.get('/viewpumps', (req, res) => {
  const sql = 'SELECT * FROM pump inner join `pump_allocation` on pump.pump_id=pump_allocation.allocation_pump_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view pumps

//  view supervisors
// app.get('/viewsupervisors', (req, res) => {
//   const sql = 'SELECT * FROM supervisor';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
//. end view supervisors

//  view cashier
app.get('/viewcashier', (req, res) => {
  const sql = 'SELECT * FROM `cashier_allocation` inner join cashier on cashier.cashier_id=cashier_allocation.cashier_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view shift cashier

//  view island/allocation point
app.get('/viewpumpsallocation', (req, res) => {
  const sql = 'SELECT * FROM allocation_point inner join pump_island on pump_island.island_id=allocation_point.allocation_point_id inner join pump on pump.pump_id=pump_island.pump_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/ allocation point 

//  view tank/pump
app.get('/viewtankpump', (req, res) => {
  const sql = 'SELECT * FROM `tank` inner join tank_pump on tank_pump.tank_id = tank.tank_id inner join pump on pump.pump_id = tank_pump.pump_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view tank/pump

//  view island/product type 
app.get('/viewislandproduct', (req, res) => {
  const sql = 'SELECT * FROM `allocation_point` inner join island_none_fuel on island_none_fuel.island_id = allocation_point.allocation_point_id inner join product_type on product_type.product_type_id = island_none_fuel.nonefuel_product_type_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/product type

//  view routine cashier
// app.get('/routinecashier', (req, res) => {

//   //select final shift

//   const sql = 'SELECT * FROM `shift` order by shift_id DESC limit 1';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }

//     // end select final shift

//   const sql = 'SELECT * FROM `routine_cashier` inner join cashier on routine_cashier.routine_cashier_id=cashier.cashier_id';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
// });


app.get('/routinecashier', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }


    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id WHERE routine_cashier.routine_shift_id= ?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

//. end view shift cashier


app.get('/routineislandcashier', (req, res) => {
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }
    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT * FROM `routine_cashier_island` inner join routine_island on routine_island.routine_id=routine_cashier_island.routine_allocation_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id WHERE routine_cashier.routine_shift_id= ?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

//. end view shift cashier


//cashier allocation point

app.get('/cashierallocation', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
    const routineSql = 'SELECT * FROM `routine_cashier_island` inner join routine_island on routine_island.routine_id=routine_cashier_island.routine_allocation_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join shift on shift.shift_id=routine_island.routine_shift_id where shift.shift_id=?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

//cashier allocatiopn point


//  view cashiershift
// app.get('/transfercashier', (req, res) => {
//   const sql = 'SELECT * FROM `routine_cashier` inner join cashier on routine_cashier.routine_cashier_id=cashier.cashier_id inner join routine_cashier_type on routine_cashier_type.type_routine_cashier_id=routine_cashier.routine_id inner join product_type on product_type.product_type_id=routine_cashier_type.product_type_id inner join routine_cashier_island on routine_cashier_island.routine_cashier_id=routine_cashier.routine_id inner join routine_island on routine_island.routine_id=routine_cashier_island.routine_allocation_id';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });



app.get('/transfercashier', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT * FROM `routine_cashier` inner join cashier on routine_cashier.routine_cashier_id=cashier.cashier_id inner join routine_cashier_type on routine_cashier_type.type_routine_cashier_id=routine_cashier.routine_id inner join product_type on product_type.product_type_id=routine_cashier_type.product_type_id inner join routine_cashier_island on routine_cashier_island.routine_cashier_id=routine_cashier.routine_id inner join routine_island on routine_island.routine_id=routine_cashier_island.routine_allocation_id where routine_cashier.routine_shift_id = ?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});
//. end view cashier shift

// updated transfer filer

app.get('/transferislandproducts', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT * FROM `island_none_fuel` inner join allocation_point on allocation_point.allocation_point_id=island_none_fuel.island_id inner join product_type on product_type.product_type_id= island_none_fuel.nonefuel_product_type_id inner join routine_island on routine_island.routine_island_id= allocation_point.allocation_point_id inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=routine_island.routine_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id= routine_cashier.routine_cashier_id inner join shift on shift.shift_id = routine_cashier.routine_shift_id where shift.shift_id=?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

// end update  transfer filer


//....................................................................................................................................

// updated transfer filer

app.get('/transferislandproduct', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
   // const routineSql = 'SELECT * FROM `routine_cashier` INNER JOIN `cashier` ON routine_cashier.routine_cashier_id = cashier.cashier_id inner join routine_island on routine_island.routine_shift_id=routine_cashier.routine_shift_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id WHERE routine_cashier.routine_shift_id = ?';
    const routineSql = 'SELECT * FROM `routine_cashier_island` inner join routine_cashier on routine_cashier.routine_id= routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join allocation_point on allocation_point.allocation_point_id= routine_cashier_island.routine_allocation_id inner join island_none_fuel on island_none_fuel.island_id= allocation_point.allocation_point_id inner join product_type on product_type.product_type_id=island_none_fuel.nonefuel_product_type_id inner join shift on shift.shift_id=routine_cashier.routine_shift_id where shift.shift_id=?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

// end update  transfer filer

//....................................................................................................................................


//  view cashier
app.get('/customers', (req, res) => {
  const sql = 'SELECT * FROM customers';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view shift cashier

app.get('/shiftcashier', (req, res) => {
    // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }
  
      // Check if there are any shift records
      if (shiftResults.length === 0) {
        return res.json({ error: 'No shift records found' });
      }
  
      // Get the ID of the last shift
      const lastShiftId = shiftResults[0].shift_id;
  console.log(lastShiftId)
     // return res.json('last shift id '+lastShiftId);
  
  const sql = 'SELECT * FROM `routine_cashier` inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join shift on shift.shift_id=routine_cashier.routine_shift_id inner join routine_cashier_island on routine_cashier_island.routine_cashier_id=routine_cashier.routine_id inner join allocation_point on allocation_point.allocation_point_id=routine_cashier_island.routine_allocation_id where shift.shift_id=?';
  con.query(sql, [lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view shift cashier

//  view admin
app.get('/viewadmin', (req, res) => {
  const sql = 'SELECT * FROM admin';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view admin

//  view Tank
app.get('/viewtank', (req, res) => {
  const sql = 'SELECT * FROM tank inner join tank_allocation on tank.tank_id=tank_allocation.allocation_tank_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view tank


//  view pump tank allocation
app.get('/viewpumptank', (req, res) => {
  const sql = 'SELECT * FROM `tank_pump` inner join tank on tank.tank_id=tank_pump.tank_id inner join pump on pump.pump_id= tank_pump.pump_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view pump tank allocation

//  view allocationpoint
// app.get('/viewallocationpointe', (req, res) => {
//   const sql = 'SELECT * FROM allocation_point';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
//. end view allocationpoint

//  view shift allocationpoint
app.get('/shiftallocationpoint', (req, res) => {
    // Select final shift to get its ID
    station_id=req.query.stationId;

    const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
    con.query(shiftSql, station_id,(err, shiftResults) => {
      if (err) {
        return res.json(err);
      }
  
      // Check if there are any shift records
      if (shiftResults.length === 0) {
        return res.json({ error: 'No shift records found' });
      }
  
      // Get the ID of the last shift
      const lastShiftId = shiftResults[0].shift_id;
  
     // return res.json('last shift id '+lastShiftId);
  
 // const sql = 'SELECT * FROM `routine_island` inner join  allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join shift on shift.shift_id=routine_island.routine_shift_id where routine_island.routine_shift_id=? order by allocation_point.allocation_point_id';
 //const sql='SELECT * FROM allocation_point LEFT JOIN pump_island ON allocation_point.allocation_point_id = pump_island.island_id LEFT JOIN pump ON pump_island.pump_id = pump.pump_id inner join routine_island on routine_island.routine_island_id=allocation_point.allocation_point_id inner join shift on shift.shift_id=routine_island.routine_shift_id inner join pump_routine on pump_routine.shift_id=shift.shift_id where routine_island.routine_shift_id=? order by allocation_point.allocation_point_id';
 const sql='SELECT DISTINCT allocation_point.allocation_point_id,shift.shift_id,pump_routine.routine_pump_id,pump.pump_code,pump.pump_id, allocation_point.* FROM allocation_point LEFT JOIN pump_island ON allocation_point.allocation_point_id = pump_island.island_id LEFT JOIN pump ON pump_island.pump_id = pump.pump_id LEFT JOIN pump_routine ON pump_routine.routine_pump_id=pump.pump_id INNER JOIN routine_island ON routine_island.routine_island_id = allocation_point.allocation_point_id INNER JOIN shift ON shift.shift_id = routine_island.routine_shift_id WHERE shift.shift_id = ? ORDER BY allocation_point.allocation_point_id';
 con.query(sql,[lastShiftId], (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
});
//. end view shift allocationpoint

//  view shift islandpump
app.get('/shiftislandpump', (req, res) => {
  // Select final shift to get its ID
  const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, (err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

const sql = 'SELECT * FROM `pump_routine` inner join pump on pump_routine.routine_pump_id=pump.pump_id  inner join shift on shift.shift_id=pump_routine.shift_id where shift.shift_id=?';
con.query(sql,[lastShiftId], (err, results) => {
  if (err) {
    return res.json(err);
  }
  return res.json(results);
});
});
});
//. end view shiftislandpump

//  view stocks
app.get('/viewstock', (req, res) => {
  const sql = 'SELECT * FROM `stock` inner join product_name on product_name.product_item_id=stock.stock_product_id inner join product_classes on product_classes.product_class_id=product_name.product_item_class_id inner join product_type on product_type.product_type_id=product_classes.product_type_id inner join stock_remaining on stock_remaining.stock_product_id= product_name.product_item_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view Stocks





//transfer stock
// attach assets to station
app.post('/stocktransfer', (req, res) => {

   const {selectedtransfer,selectedstock} = req.body;
  
console.log(req.body); // Inspect the structure and content of req.body

   const stock = selectedstock.map((item) => [item.id]);

  // console.log(stock);


console.log('tapped');
con.beginTransaction((err) => {
  if (err) {
    console.log('Transaction start failed:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }

  const loginSql = 'INSERT INTO `station_asset_attachment`(`station_tank_id`, `station_pump_id`, `allocation_point_id`, `station_supervisor_id`, `station_station_id`) VALUES (?,?,?,?,?)';
      con.query(loginSql, [selectedtanks, selectedpump,selectedallocationpoints,selectedsupervisors,selectedstations], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to register tank:', loginErr);
            return res.status(500).json({ message: 'Registration failed' });
          });
  
        }

        con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Registration failed' });
              });
            }

            console.log('Registration successful');
            return res.status(200).json({ message: 'Registration successful' });
        });
      });
});
});

//. end transfer stock

//cashier product type stock

app.post('/cashierproducttype', (req, res) => {
  const { selectedcashier,selectedproducttype} = req.body;

//  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  //const stockValues = Object.values(selectedproducttype);

  console.log(selectedcashier+' '+selectedproducttype)

  // stockValues.forEach((item) => {
  //     const transfer_id = item;

  // console.log(item)
  //   const query =
  //     'INSERT INTO `routine_cashier_type`(`type_routine_cashier_id`, `product_type_id`) VALUES (?, ?)';

  //   con.query(query, [transfer_id, selectedcashier], (error, results) => {
  //     if (error) {
  //       console.error('Error inserting data:', error);
  //     } else {
  //       console.log('Data inserted successfully');
  //     }
  //   });
  // });
});



// end cashier product type stock


//trialselect stock

app.post('/stocktrial', (req, res) => {
  const { selectedtransfer, selectedstock, capacity } = req.body;

  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  const stockValues = Object.values(selectedstock);

  console.log(stockValues)

  stockValues.forEach((item) => {
      const transfer_id = item;

  console.log(item)
    const query =
      'INSERT INTO `stock_transfer` (`transfer_capacity`, `transfer_stock_id`, `transfer_date`, `transfer_to`) VALUES (?, ?, ?, ?,?,?)';

    con.query(query, [capacity, transfer_id, currentTime,selectedtransfer], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('Data inserted successfully');
      }
    });
  });
});



// end trial stock


//trialselect partial sales

// app.post('/partialsales', (req, res) => {
//   const formattedData  = req.body;

//   const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

//   //const partials = Object.values(formattedData);

//   console.log(formattedData)


//     const query =
//        'INSERT INTO `partial_sales`(`partial_sales_shift_id`, `partial_routine_cashier_island`, `partial_island_id`, `partial_sold_product_type`, `partial_sold_sales_price`, `partial_item_quantity`, `total_amount`) VALUES ?';

//        const values = formattedData.map((data) => [
//         data.shift_id,
//         data.cashier_island_id,
//         data.allocation_point_id,
//         data.product_type__id,
//         data.product_price,
//         data.sold,
//         data.totalsales,
//       ]);

//      con.query(query, [values], (err, result) => {
//        if (err) {
//            console.error('Error inserting data into the database:', err);
//       } else {
//           console.log('Data inserted successfully');
//        }
//    });
// });


app.post('/partialsales', (req, res) => {
  const formattedData = req.body;
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  console.log(formattedData);

  // Loop through the formattedData array and insert records one by one
  formattedData.forEach(data => {
      // Calculate current_shift_stock by retrieving the existing value from the stock table
      // add stationrighthere
      console.log('port station of concern is ',data.station);
      // Select the current remaining stock
      const selectRemainingStockQuery = `
      SELECT remaining_stock
      FROM stock_remaining
      WHERE stock_product_id = ? AND station_id = ?
    `;
      con.query(selectRemainingStockQuery, [data.product_item_id, data.station], (err, selectResult) => {
        if (err) {
          console.error('Error selecting remaining stock:', err);
        } else {
          if (selectResult.length > 0) {
            const currentRemainingStock = selectResult[0].remaining_stock;
          
            const newRemainingStock = parseFloat(currentRemainingStock) - parseFloat(data.sold);
            console.log(parseFloat(currentRemainingStock),' - ', parseFloat(data.sold),' = ',newRemainingStock)
  
            // Update the stock_remaining table with the new remaining stock value
            const updateRemainingStockQuery = `
              UPDATE stock_remaining
              SET remaining_stock = ?
              WHERE stock_product_id = ? AND station_id = ?
            `;
  
            const updateRemainingStockValues = [newRemainingStock, data.product_item_id, data.station];
  
            con.query(updateRemainingStockQuery, updateRemainingStockValues, (err, updateResult) => {
              if (err) {
                console.error('Error updating remaining stock:', err);
              } else {
                console.log('Remaining stock updated successfully');
              }
            });
          } else {
            console.error('No record found in stock_remaining table for the given product and station.');
          }
        }
      });

      // Insert data into the partial_sales table
      const insertQuery =
          'INSERT INTO `partial_sales` (`partial_sales_shift_id`, `partial_routine_cashier_island`, `partial_island_id`, `partial_sold_product_type`, `partial_sold_sales_price`, `partial_item_quantity`, `total_amount`, `sales_item_id`,`station_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)';

      const insertValues = [
          data.shift_id,
          data.cashier_island_id,
          data.allocation_point_id,
          data.product_type__id,
          data.product_price,
          data.sold,
          data.totalsales,
          data.product_item_id,
          data.station

        
      ];

      con.query(insertQuery, insertValues, (err, insertResult) => {
          if (err) {
              console.error('Error inserting data into the database:', err);
          } else {

  const updatenonefuel="UPDATE `non_fuel_routine_sales` SET `closing_stock`=? WHERE `shift_id`=? AND `station_id`=? AND `product_name_id`=?"

  
  const updateValues = [
    data.closing,
    data.shift_id,
    data.station,
    data.product_item_id 
  
];

  con.query(updatenonefuel, updateValues, (updateErr, updateResult) => {
    if (updateErr) {
      console.error('Error updating product:', updateErr);
      return res.status(500).send('Error updating product');
    }
  
    console.log('Product updated successfully');
  
  });
              //console.log('Data inserted successfully');
          }
      });
  });
  res.status(200).send('Product updated successfully');
  //res.send('Data insertion and stock update in progress...');
});


// end trial partial sales

// asset attachement

// app.post('/stationassetattachment', (req, res) => {
//   const { selectedallocationpoints, selectedproducttypes, selectedpump, selectedtank } = req.body;
//   console.log('islands', selectedallocationpoints, 'p type', selectedproducttypes, 'pumps', selectedpump, 'tanks', selectedtank);

//   if (selectedallocationpoints.length > 0) {
//     // Islands are selected, so insert pumps into pump_island
//     selectedpump.forEach(pumpId => {
//       selectedallocationpoints.forEach(islandId => {
//         // Insert into pump_island (pump_id, island_id)
//         // Example SQL: INSERT INTO pump_island (pump_id, island_id) VALUES (pumpId, islandId);
//         const query =
//         'INSERT INTO pump_island (pump_id, island_id) VALUES (?, ?)';
  
//       con.query(query, [pumpId,islandId], (error, results) => {
//         if (error) {
//           console.error('Error inserting data:', error);
//         } else {
//           console.log('Data inserted successfully');
//         }
//       });
     
//       });
//     }

//     if (selectedtank.length > 0) {
//       // Tanks are selected, so insert pump-tank connections into tank_pump
//       selectedpump.forEach(pumpId => {
//         selectedtank.forEach(tankId => {
//           let stationId=0;
//           // Insert into tank_pump (tank_id, pump_id, station_id)
//           // Example SQL: INSERT INTO tank_pump (tank_id, pump_id, station_id) VALUES (tankId, pumpId, stationId);
//           const query =
//           'INSERT INTO tank_pump (tank_id, pump_id, station_id) VALUES (?, ?, ?)';
    
//         con.query(query, [tankId,pumpId,stationId], (error, results) => {
//           if (error) {
//             console.error('Error inserting data:', error);
//           } else {
//             console.log('Data inserted successfully');
//           }
//         });
       
//         });
//       });
//     }
//   }

//   if (selectedproducttypes.length > 0) {
//     // Product types are selected, so insert each product type connection to the island
//     selectedallocationpoints.forEach(islandId => {
//       selectedproducttypes.forEach(productTypeId => {
//         // Insert into island_none_fuel (island_id, nonefuel_product_type_id)
//         // Example SQL: INSERT INTO island_none_fuel (island_id, nonefuel_product_type_id) VALUES (islandId, productTypeId);
//         const query =
//         'INSERT INTO island_none_fuel (island_id, nonefuel_product_type_id) VALUES (?,?)';
  
//       con.query(query, [islandId, productTypeId], (error, results) => {
//         if (error) {
//           console.error('Error inserting data:', error);
//         } else {
//           console.log('Data inserted successfully');
//         }
//       });
     
//       });
//     }
//   }

//   // Respond with a success message or handle errors accordingly
//   // res.send('Data inserted successfully');
// });

app.post('/stationassetattachment', (req, res) => {
  const { selectedallocationpoints, selectedproducttypes,selectedtank, selectedpump, stationId } = req.body;
  console.log('islands', selectedallocationpoints, 'p type', selectedproducttypes, 'pumps', selectedpump, 'tanks', selectedtank);

  if (selectedallocationpoints.length > 0 && selectedpump.length > 0) {
    selectedpump.forEach(pumpId => {
        const query = 'INSERT INTO pump_island (pump_id, island_id, station_id) VALUES (?,?,?)';
        con.query(query, [pumpId, selectedallocationpoints, stationId], (error, results) => {
          if (error) {
            console.error('Error inserting data into pump_island:', error);
            res.status(500).send('Error inserting data into pump_island');
          } else {
            console.log('Data inserted into pump_island successfully');
          }
        });
  
    });
  }

  if (selectedtank.length > 0 && selectedpump.length > 0) {
    selectedpump.forEach(pumpId => {
      selectedtank.forEach(tankId => {
      //  const stationId = 0; // Replace with your station ID
        const query = 'INSERT INTO tank_pump (tank_id, pump_id, station_id) VALUES (?, ?, ?)';
        con.query(query, [tankId, pumpId, stationId], (error, results) => {
          if (error) {
            console.error('Error inserting data into tank_pump:', error);
            res.status(500).send('Error inserting data into tank_pump');
          } else {
            console.log('Data inserted into tank_pump successfully');
          }
        });
      });
    });
  }

  if (selectedproducttypes.length > 0 && selectedallocationpoints > 0) {
      selectedproducttypes.forEach(productTypeId => {
        const query = 'INSERT INTO island_none_fuel (island_id, nonefuel_product_type_id) VALUES (?, ?)';
        con.query(query, [selectedallocationpoints, productTypeId], (error, results) => {
          if (error) {
            console.error('Error inserting data into island_none_fuel:', error);
            res.status(500).send('Error inserting data into island_none_fuel');
          } else {
            console.log('Data inserted into island_none_fuel successfully');
          }
        });
      });
  
  }

  res.send('Data insertion completed'); // Send a response to the client when all operations are done
});


//asset attachment

//reconcilliation


app.post('/reconcilliate', (req, res) => {
  const formattedData = req.body;
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  console.log(formattedData);
  let reconciliationInsertSuccess = true;
  let station;
  let shift;

  // Loop through the formattedData array and insert records one by one
  formattedData.forEach(data => {
 
    console.log('station is ',data.stationId,'supervisor is ',data.recsupervisor,' and shift is ',data.shift_id);
      // Insert data into the partial_sales table
      station=data.stationId;
      shift=data.shift_id;

      const insertQuery =
          'INSERT INTO `reconcilliation`( `island_id`, `total_sales`, `invoice_sales`, `credit_sales`, `dropped`, `expected`, `variance`,`station_id`,`supervisor`,`shift_id`) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?)';

      const insertValues = [
  
          data.island_id,
          data.total,
          data.invoice,
          data.credit,
          data.drops,
          data. expected,
          data.variance,
          data.stationId,
          data.recsupervisor,
          data.shift_id

        
      ];

      con.query(insertQuery, insertValues, (err, insertResult) => {
          if (err) {
              console.error('Error inserting data into the database:', err);
          } else {
            reconciliationInsertSuccess = false;
              console.log('Data inserted successfully');
          }
      });
  });

    // After inserting all reconciliation data, check if insertion was successful
    if (reconciliationInsertSuccess) {
      console.log('hello');
      // Update the shift status in the shift table
      const updateShiftQuery = 'UPDATE `shift` SET `shift_status` = 1 WHERE `shift_id` = ? AND `station_id` = ?';
      const updateShiftValues = [shift, station];
  
      con.query(updateShiftQuery, updateShiftValues, (err, updateResult) => {
        if (err) {
          console.error('Error updating shift status:', err);
        } else {
          console.log('Shift status updated successfully');
        }
      });
    }
  

  res.send('Data insertion and stock update in progress...');
});


// end trial partial sales




//end reconcilliation



//insert meter rteading




// app.post('/fuelsales', (req, res) => {
//   const formattedData = req.body;

//   const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
//   let station=1;

//       // Select final shift to get its ID
//       const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
//       con.query(shiftSql, (err, shiftResults) => {
//         if (err) {
//           return res.json(err);
//         }
    
//         // Check if there are any shift records
//         if (shiftResults.length === 0) {
//           return res.json({ error: 'No shift records found' });
//         }
    
//         // Get the ID of the last shift
//         const lastShiftId = shiftResults[0].shift_id;
    
//        // return res.json('last shift id '+lastShiftId);
    

//   // Calculate the differences between the previous and current readings
//   const queryPrevious = `
//     SELECT manual_meter AS previous_cash_meter, electric_meter AS previous_electric_meter
//     FROM pump_meter_reading
//     WHERE pump_id = ? AND reading_shift_id = ?
//     ORDER BY reading_id DESC
//     LIMIT 1
//   `;

//   con.query(queryPrevious, [formattedData[0].pump_id, formattedData[0].reading_shift_id], (err, result) => {
//     if (err) {
//       console.error('Error retrieving previous data:', err);
//     } else {
//       const previousData = result[0];
//       const currentData = formattedData[0];

//       // Calculate differences
//       const cashMeterDifference = currentData.manualmeter - (previousData ? previousData.previous_cash_meter : 0);
//       const electricMeterDifference = currentData.electricmeter - (previousData ? previousData.previous_electric_meter : 0);

//       // Calculate the average of the differences
//       const average = (cashMeterDifference + electricMeterDifference) / 2;

//       // Update the fuel_capacity_control table
//       const updateQuery = `
//         INSERT INTO fuel_capacity_control (content_fuel_product_id, current_capacity, sold_content, shift_id, station_id)
//         VALUES (?, ?, ?, ?, ?)
//       `;

//       const currentCapacity = previousData
//         ? previousData.previous_cash_meter - currentData.cashmeter
//         : 0;

//       con.query(
//         updateQuery,
//         [
//           currentData.pump_id,
//           currentCapacity,
//           average,
//           lastShiftId,
//           station,
//         ],
//         (updateErr, updateResult) => {
//           if (updateErr) {
//             console.error('Error updating fuel_capacity_control:', updateErr);
//           } else {
//             console.log('Data inserted successfully');
//           }
//         }
//       );
//     }
//   });
// });

//   // Insert meter reading data into the pump_meter_reading table
//   const query = `
//     INSERT INTO pump_meter_reading (cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//     VALUES (?)
//   `;

//   const values = formattedData.map((data) => [
//     data.cashmeter,
//     data.electricmeter,
//     data.manualmeter,
//     data.pump_id,
//     data.allocation_point_id,
//     data.shift_id,
//   ]);

//   con.query(query, values, (err, result) => {
//     if (err) {
//       console.error('Error inserting data into the database:', err);
//     } else {
//       console.log('Data inserted successfully');
//     }
//   });
// });


// app.post('/fuelsales', (req, res) => {
//   const formattedData = req.body;
//   const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
//   let station = formattedData[0].stationId;
//   let dipInputData = formattedData[0].dipinputData;

//   // Get an array of unique pump IDs from formattedData
//   const pumpIds = Array.from(new Set(formattedData.map(data => data.pump_id)));

//   let average;
//   let avgpumpId;

//   // Select final shift to get its ID
//   const shiftSql = 'SELECT * FROM `shift` WHERE `station_id`=? ORDER BY shift_id DESC LIMIT 1';

//   con.query(shiftSql, station, (err, shiftResults) => {
//     if (err) {
//       return res.json(err);
//     }

//     // Check if there are any shift records
//     if (shiftResults.length === 0) {
//       return res.json({ error: 'No shift records found' });
//     }

//     // Get the ID of the last shift
//     const lastShiftId = shiftResults[0].shift_id;

//     // Calculate the differences between yesterday's and today's readings for each pump
//     const queryPrevious = `
//       SELECT pump_id, cash_meter, electric_meter, manual_meter
//       FROM pump_meter_reading
//       WHERE (pump_id, reading_id) IN (
//         SELECT pump_id, MAX(reading_id) as max_reading_id
//         FROM pump_meter_reading
//         WHERE pump_id IN (?)
//         GROUP BY pump_id
//       )
//       ORDER BY pump_id;
//     `;

//     con.query(queryPrevious, [pumpIds], (err, results) => {
//       if (err) {
//         console.error('Error retrieving previous data:', err);
//       } else {
//         const previousDataMap = new Map();
//         results.forEach(row => {
//           previousDataMap.set(row.pump_id, {
//             cash_meter: row.cash_meter,
//             electric_meter: row.electric_meter,
//             manual_meter: row.manual_meter
//           });
//         });

//         const salesData = [];

//         // Now you have a Map (previousDataMap) with pump_id as keys and the last recorded values as values.
//         formattedData.forEach(currentData => {
//           const previousData = previousDataMap.get(currentData.pump_id);

//           if (previousData) {
//             const manualMeterDifference = parseFloat(currentData.manualmeter) - parseFloat(previousData.manual_meter);
//             const electricMeterDifference = parseFloat(currentData.electricmeter) - parseFloat(previousData.electric_meter);
//             const cashMeterDifference = parseFloat(currentData.cashmeter) - parseFloat(previousData.cash_meter);

//             // Create a JSON object for each pump's differences
//             const pumpSales = {
//               pump_id: currentData.pump_id,
//               allocation_point_id: currentData.allocation_point_id,
//               manual_meter_difference: manualMeterDifference,
//               electric_meter_difference: electricMeterDifference,
//               cash_meter_difference: cashMeterDifference
//             };

//             salesData.push(pumpSales);
//           }
//         });
      

//         // Insert sales data into the shift_pump_sales table
//         const insertSalesQuery = `
//           INSERT INTO shift_pump_sales(cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//           VALUES (?, ?, ?, ?, ?, ?)
//         `;

//         salesData.forEach(sales => {
//           const values = [
//             sales.cash_meter_difference,
//             sales.electric_meter_difference,
//             sales.manual_meter_difference,
//             sales.pump_id,
//             sales.allocation_point_id,
//             formattedData[0].shift_id
//           ];

//           // Update fuel capacity for each pump
//           average = (sales.manual_meter_difference + sales.electric_meter_difference) / 2;
//           avgpumpId = sales.pump_id;

//           con.query(insertSalesQuery, values, (salesErr, salesResult) => {
//             if (salesErr) {
//               console.error('Error inserting today\'s actual fuel sales:', salesErr);
//             } else {
//               console.log('Shift pump sales data inserted successfully');
//             }
//           });
//         });

//         // Insert dip input data into the dip table
//       dipInputData.forEach(dipData => {
//       let tankId;

//       if (Object.keys(dipData).length > 0) {
//         for (const key in dipData) {
//           tankId = dipData[key].tankid;
//           console.log('Tank ID:', tankId);
//         }

//         console.log(dipData);

//         try {
//           const tankDataQuery = `
//             SELECT total, dips
//             FROM dip
//             WHERE tank_id = ? and dip_station_id = ?
//           `;

//           const [tankDataRows] = con.query(tankDataQuery, [tankId, station]);

//           const tankData = tankDataRows.length === 0 ? [] : tankDataRows[0];

//           const pumpTotalsQuery = `
//             SELECT SUM((s.electric_meter_difference + s.manual_meter_difference) / 2) AS total
//             FROM shift_pump_sales s
//             JOIN pump p ON s.pump_id = p.pump_id
//             JOIN tank_pump tp ON p.pump_id = tp.pump_id
//             WHERE tp.tank_id = ?
//               AND s.pump_id IN (${Array(pumpIds.length).fill('?').join(', ')});
//           `;

//           const [pumpTotalsRows] = con.query(pumpTotalsQuery, [...pumpIds]);
//           const pumpTotals = pumpTotalsRows[0].total || 0;

//           const dipInsertQuery = `
//             INSERT INTO dip(opening, additional, total, dips, variance, dip_tank_content_id, dip_shift_id, dip_tank_id, dip_station_id)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//           `;

//           const dipValues = [
//             tankData.lastShiftTotal,
//             pumpTotals,
//             tankData.lastShiftTotal + pumpTotals,
//             dipData.dips,
//             tankData.tankDip,
//             dipData.tankId,
//             formattedData[0].shift_id,
//             dipData.tankId,
//             formattedData[0].stationId
//           ];

//           con.query(dipInsertQuery, dipValues, (dipErr, dipResult) => {
//             if (dipErr) {
//               console.error('Error inserting dip data:', dipErr);
//             } else {
//               console.log('Dip data inserted successfully');
//             }
//           });
//         } catch {
//           console.error('Error inserting dip data:');
//         }
//       } else {
//         console.log('No keys found in dipData');
//       }
//     });
//   });
// })
// })

app.post('/fuelsales', (req, res) => {
  const formattedData = req.body;
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  let station = formattedData[0].stationId;
  let dipInputData = formattedData[0].dipinputData;

 // console.log('dipInput is ', dipInputData);

  const pumpIds = Array.from(new Set(formattedData.map(data => data.pump_id)));

 // console.log(pumpIds);

  let average;
  let avgpumpId;

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }

 // console.log('station id ', station, 'and pump is ', formattedData[0].pump_id);
  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';

  con.query(shiftSql, station, (err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    const lastShiftId = shiftResults[0].shift_id;

    const queryPrevious = `
      SELECT pump_id, cash_meter, electric_meter, manual_meter
      FROM pump_meter_reading
      WHERE (pump_id, reading_id) IN (
        SELECT pump_id, MAX(reading_id) as max_reading_id
        FROM pump_meter_reading
        WHERE pump_id IN (?)
        GROUP BY pump_id
      )
      ORDER BY pump_id;
    `;

  //   const queryCapacity = `
  //   SELECT product_name.product_item_id, fuel_capacity_control.current_capacity
  //   FROM pump
  //   INNER JOIN tank_pump ON tank_pump.pump_id = pump.pump_id
  //   INNER JOIN tank ON tank.tank_id = tank_pump.tank_id
  //   INNER JOIN tank_content ON tank_content.tank_id = tank.tank_id
  //   INNER JOIN product_name ON product_name.product_item_id = tank_content.tank_content_product_id
  //   INNER JOIN fuel_capacity_control ON fuel_capacity_control.content_fuel_product_id = product_name.product_item_id
  //   WHERE pump.pump_id IN (?)
  // `;

    con.query(queryPrevious, [pumpIds], (err, results) => {
      if (err) {
        console.error('Error retrieving previous data:', err);
      } else {
        //console.log('found ', results);
        const previousDataMap = new Map();
        results.forEach(row => {
          previousDataMap.set(row.pump_id, {
            cash_meter: row.cash_meter,
            electric_meter: row.electric_meter,
            manual_meter: row.manual_meter
          });
        });

        const salesData = [];

        formattedData.forEach(currentData => {
          const previousData = previousDataMap.get(currentData.pump_id);

          if (previousData) {
            const manualMeterDifference = parseFloat(currentData.manualmeter) - parseFloat(previousData.manual_meter);
            const electricMeterDifference = parseFloat(currentData.electricmeter) - parseFloat(previousData.electric_meter);
            const cashMeterDifference = parseFloat(currentData.cashmeter) - parseFloat(previousData.cash_meter);

         //   console.log('current island ', currentData);
            console.log('cash difference ', parseFloat(currentData.cashmeter), ' - ', parseFloat(previousData.cash_meter), ' = ', cashMeterDifference, ' electric meter ', parseFloat(currentData.electricmeter), '- ', parseFloat(previousData.electric_meter), ' = ', electricMeterDifference, ' manual ', parseFloat(currentData.manualmeter), ' -', parseFloat(previousData.manual_meter), ' = ', manualMeterDifference);

            const pumpSales = {
              pump_id: currentData.pump_id,
              allocation_point_id: currentData.allocation_point_id,
              manual_meter_difference: manualMeterDifference,
              electric_meter_difference: electricMeterDifference,
              cash_meter_difference: cashMeterDifference
            };

            salesData.push(pumpSales);
          }
        });

        const insertSalesQuery = `
          INSERT INTO shift_pump_sales( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        salesData.forEach(sales => {
          const values = [
            sales.cash_meter_difference,
            sales.electric_meter_difference,
            sales.manual_meter_difference,
            sales.pump_id,
            sales.allocation_point_id,
            formattedData[0].shift_id
          ];

          average = (sales.manual_meter_difference + sales.electric_meter_difference) / 2;
          avgpumpId = sales.pump_id;
          con.query(insertSalesQuery, values, (salesErr, salesResult) => {
            if (salesErr) {
              console.error('Error inserting todays actual fuel sales:', salesErr);
            } else {
              console.log('shift pump Sales data inserted successfully');
            }
          });
        });
      }
    });

    const query = `
      INSERT INTO pump_meter_reading( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
      VALUES(?,?,?,?,?,?)
    `;

    formattedData.forEach((data) => {
      const values = [
        data.cashmeter,
        data.electricmeter,
        data.manualmeter,
        data.pump_id,
        data.allocation_point_id,
        data.shift_id,
      ];

      con.query(query, values, (err, result) => {
        if (err) {
          console.error('Error inserting data into the database:', err);
        } else {
          console.log('pump meter reading inserted successfully');
        }
      });
    });

    dipInputData.forEach((dipData) => {
      if (Object.keys(dipData).length > 0) {
        let tankId;

        for (const key in dipData) {
          if (typeof dipData[key] === 'object' && dipData[key].tankid) {
            tankId = dipData[key].tankid;
            tankdip = dipData[key].tankname
            break; // Exit the loop once a tank ID is found
          }
        }
    
        
        console.log('tank id is ',tankId,' current dip ',tankdip)
    
        try {
          const tankDataQuery = `
          SELECT total, dips
          FROM dip
          WHERE dip_tank_id = ?
            AND dip_station_id = ?
          ORDER BY dip_id DESC
          LIMIT 1;
          
          `;
  
          con.query(tankDataQuery, [tankId, station], (tankErr, results) => {
            if (tankErr) {
              console.error('Error querying tank data:', tankErr);
              return;
            }
         
           // const opening=results[0].length === 0 ? 0 : results[0].total;
            const opening = results && results.length > 0 ? results[0].total : 0;

            
           
            let content;

            // select the content

            const contentQuery = `
            SELECT * from tank inner join tank_content on tank_content.tank_id=tank.tank_id inner join product_name on product_name.product_item_id=tank_content.tank_content_product_id where tank.tank_id=?
            
            `;
    
            con.query(contentQuery, [tankId], (tankErr, contentresults) => {
              if (tankErr) {
                console.error('Error querying tank data:', tankErr);
                return;
              }
          
             // const opening=results[0].length === 0 ? 0 : results[0].total;
              content = contentresults && contentresults.length > 0 ? contentresults[0].product_item_id : 0;
              console.log('content found ',content)
            });
            // end select contend
          
            console.log('opening total dip ',opening,' content id ',content)


              // Fetching totals from all pumps associated with the tank
            const pumpTotalsQuery = `
            SELECT SUM((s.electric_meter + s.manual_meter) / 2) AS total
            FROM shift_pump_sales s
            JOIN pump p ON s.pump_id = p.pump_id
            JOIN tank_pump tp ON p.pump_id = tp.pump_id
            WHERE tp.tank_id = ? AND reading_shift_id=?
              AND s.pump_id IN (${Array(pumpIds.length).fill('?').join(', ')});
          `;
    
          con.query(pumpTotalsQuery, [tankId, lastShiftId, ...pumpIds], (pumpErr, pumpTotalsRows) => {
            if (pumpErr) {
              console.error('Error querying pump totals:', pumpErr);
              return;
            }
  
            //console.log('shift sales data ',pumpTotalsRows)
            const pumpTotals = pumpTotalsRows[0]?.total || 0;
  
            const dipInsertQuery = `
              INSERT INTO dip(opening, additional, total, dips, variance, dip_tank_content_id, dip_shift_id, dip_tank_id, dip_station_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
  
            const dipValues = [
              opening,
              pumpTotals,
              parseFloat(opening) + pumpTotals,
              parseFloat(tankdip),
              (parseFloat(opening) + pumpTotals) - parseFloat(tankdip),
              content,
              lastShiftId,
              tankId,
              formattedData[0].stationId,
            ];
  
            console.log('dip values ', dipValues);
    
            con.query(dipInsertQuery, dipValues, (dipErr, dipResult) => {
              if (dipErr) {
                console.error('Error inserting dip data:', dipErr);
              } else {
                console.log('Dip data inserted successfully');
                //return res.status(200).json({ message: 'transaction successful' });
              }
            });
            });
          });
        } catch (error) {
          console.error('Error:', error);
        }
      } else {
        console.log('No keys found in dipData');
        return res.status(500).json({ message: 'transaction unsuccessful' });
      }
    });

       
    con.commit((commitErr) => {
      if (commitErr) {
        con.rollback(() => {
          console.log('Transaction commit failed:', commitErr);
          return res.status(500).json({ message: 'Transaction failed' });
        });
      }

      console.log('sales made successfully');
      return res.status(200).json({ message: 'sales made successfully' });
    });


    
  });

  });
});

 

// app.post('/fuelsales', (req, res) => {
//   const formattedData = req.body;
//   const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
//   //check whether this declaration work
//   let station = formattedData[0].stationId;
//   let dipInputData = formattedData[0].dipinputData;

//   console.log('dipInput is ',dipInputData);


//     // Get an array of unique pump IDs from formattedData
//     const pumpIds = Array.from(new Set(formattedData.map(data => data.pump_id)));

//     console.log(pumpIds);

// let average;
// let avgpumpId;

//   console.log('station id ',station, 'and pump is ',formattedData[0].pump_id)
//   // Select final shift to get its ID
//   const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
//   con.query(shiftSql, station,(err, shiftResults) => {
//     if (err) {
//       return res.json(err);
//     }

//     // Check if there are any shift records
//     if (shiftResults.length === 0) {
//       return res.json({ error: 'No shift records found' });
//     }

//     // Get the ID of the last shift
//     const lastShiftId = shiftResults[0].shift_id;

//        // Calculate the differences between yesterday's and today's readings for each pump
//        const queryPrevious = `
//        SELECT pump_id, cash_meter, electric_meter, manual_meter
//        FROM pump_meter_reading
//        WHERE (pump_id, reading_id) IN (
//          SELECT pump_id, MAX(reading_id) as max_reading_id
//          FROM pump_meter_reading
//          WHERE pump_id IN (?)
//          GROUP BY pump_id
//        )
//        ORDER BY pump_id;
//      `;
     

     
//     con.query(queryPrevious, [pumpIds], (err, results) => {
//       if (err) {
//         console.error('Error retrieving previous data:', err);
//       } else {
//         console.log('found ',results)
//         const previousDataMap = new Map();
//         results.forEach(row => {
//           previousDataMap.set(row.pump_id, {
//             cash_meter: row.cash_meter,
//             electric_meter: row.electric_meter,
//             manual_meter: row.manual_meter
//           });
//         });

//         const salesData = [];
//         // Now you have a Map (previousDataMap) with pump_id as keys and the last recorded values as values.
      
//         formattedData.forEach(currentData => {
//           const previousData = previousDataMap.get(currentData.pump_id);

//           if (previousData) {
//             const manualMeterDifference = parseFloat(currentData.manualmeter) - parseFloat(previousData.manual_meter);
//             const electricMeterDifference = parseFloat(currentData.electricmeter) - parseFloat(previousData.electric_meter);
//             const cashMeterDifference = parseFloat(currentData.cashmeter) - parseFloat(previousData.cash_meter);

//             // ... rest of your calculations and database operations
//             console.log('current island ',currentData)
//             console.log('cash difference ',parseFloat(currentData.cashmeter),' - ',parseFloat(previousData.cash_meter),' = ',cashMeterDifference, ' electric meter ',parseFloat(currentData.electricmeter),'- ', parseFloat(previousData.electric_meter),' = ',electricMeterDifference,' manual ',parseFloat(currentData.manualmeter),' -', parseFloat(previousData.manual_meter),' = ',manualMeterDifference);
         
//             // Create a JSON object for each pump's differences
//             const pumpSales = {
//               pump_id: currentData.pump_id,
//               allocation_point_id:currentData.allocation_point_id,
//               manual_meter_difference: manualMeterDifference,
//               electric_meter_difference: electricMeterDifference,
//               cash_meter_difference: cashMeterDifference
//             };
  
//             salesData.push(pumpSales);
//           }
//         });

//      // Insert sales data into the shift_pump_sales table
//      const insertSalesQuery = `
//      INSERT INTO shift_pump_sales( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//      VALUES (?, ?, ?, ?, ?, ?)
//    `;

//    salesData.forEach(sales => { 
//     const values = [
//       sales.cash_meter_difference,
//       sales.electric_meter_difference,
//       sales.manual_meter_difference,
//       sales.pump_id,
//       sales.allocation_point_id,
//       formattedData[0].shift_id
//     ];

//       // Update fuel capacity for each pump
//      average = (sales.manual_meter_difference + sales.electric_meter_difference) / 2;
//       avgpumpId= sales.pump_id;
//     con.query(insertSalesQuery, values, (salesErr, salesResult) => {
//       if (salesErr) {
//         console.error('Error inserting todays actiual fuel sales:', salesErr);
//       } else {
//         console.log('shift pump Sales data inserted successfully');
//       }
//     });
//   });

//     }
//   });

//   const query = `
//   INSERT INTO pump_meter_reading( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//    VALUES(?,?,?,?,?,?)
// `;

// formattedData.forEach((data) => {
//   const values = [
//     data.cashmeter,
//     data.electricmeter,
//     data.manualmeter,
//     data.pump_id,
//     data.allocation_point_id,
//     data.shift_id,
//   ];

  
//   con.query(query, values, (err, result) => {
//     if (err) {
//       console.error('Error inserting data into the database:', err);
//     } else {
//       console.log('pump meter reading inserted successfully');
//     }
//   });

// });

// });

// });




// app.post('/fuelsales', (req, res) => {
//   const formattedData = req.body;
//   const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
//   //check whether this declaration work
//   let station = formattedData[0].stationId;

//   console.log('station id ',station, 'and pump is ',formattedData[0].pump_id)
//   // Select final shift to get its ID
//   const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
//   con.query(shiftSql, station,(err, shiftResults) => {
//     if (err) {
//       return res.json(err);
//     }

//     // Check if there are any shift records
//     if (shiftResults.length === 0) {
//       return res.json({ error: 'No shift records found' });
//     }

//     // Get the ID of the last shift
//     const lastShiftId = shiftResults[0].shift_id;

//     // Calculate the differences between the previous and current readings
//     const queryPrevious = `
//       SELECT manual_meter AS previous_cash_meter, electric_meter AS previous_electric_meter
//       FROM pump_meter_reading
//       WHERE pump_id = ? AND reading_shift_id = ?
//       ORDER BY reading_id DESC
//       LIMIT 1
//     `;

//     con.query(queryPrevious, [formattedData[0].pump_id, formattedData[0].reading_shift_id], (err, result) => {
//       if (err) {
//         console.error('Error retrieving previous data:', err);
//       } else {
//         const previousData = result[0];
//         const currentData = formattedData[0];

//         // Calculate differences
//         const manualMeterDifference = currentData.manualmeter - (previousData ? previousData.previous_manual_meter : 0);
//         const electricMeterDifference = currentData.electricmeter - (previousData ? previousData.previous_electric_meter : 0);
//         const cashMeterDifference = currentData.cashmeter - (previousData ? previousData.previous_cash_meter : 0);
        
//         // Calculate the average of the differences
//         const average = (manualMeterDifference + electricMeterDifference) / 2;

//         console.log('manual ', manualMeterDifference, ' electric ', electricMeterDifference, ' cash ', cashMeterDifference);
//         const selectQuery = `
//         select * from tank_content inner join tank on tank.tank_id=tank_content.tank_id inner join tank_pump on tank_pump.tank_id=tank.tank_id inner join pump on pump.pump_id=tank_pump.pump_id inner join product_name on product_name.product_item_id=tank_content.tank_content_product_id inner join fuel_capacity_control on fuel_capacity_control.content_fuel_product_id=product_name.product_item_id where pump.pump_id=? AND tank_pump.station_id=?
//       `;


//         con.query(selectQuery, [currentData.pump_id, station], (selectErr, selectResult) => {
//           if (selectErr) {
//             console.error('product selected not in the stock:', selectErr);
//           } else {
//             const previousCapacity = selectResult[0] ? selectResult[0].current_capacity : 0;
         

//            const product=selectResult[0] ? selectResult[0].product_item_id : 0;
//             // Calculate the updated current_capacity
//             console.log('all formatted','previous capacity ',previousCapacity,' current capacity ',average)
//             const currentCapacity = parseFloat(previousCapacity) - parseFloat(average);

//             // Update the fuel_capacity_control table
//             const updateQuery = `
//             UPDATE fuel_capacity_control SET current_capacity=? WHERE content_fuel_product_id=? AND station_id=?
//             `;

//             con.query(
//               updateQuery,
//               [
//                 currentCapacity,
//                product,
//                 station,
//               ],
//               (updateErr, updateResult) => {
//                 if (updateErr) {
//                   console.error('Error updating fuel_capacity_control:', updateErr);
//                 } else {
//                   console.log('fuel capacity control inserted successfully');
//                 }
//               }
//             );
//           }
//         });

//        // inssert current shift sales data
//         const todaysquery = `
//         INSERT INTO shift_pump_sales(cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//         VALUES (?, ?, ?, ?, ?, ?)
//       `;

//       const salesValues = [
//         cashMeterDifference,
//         electricMeterDifference,
//         manualMeterDifference,
//         currentData.pump_id,
//         currentData.allocation_point_id,
//         currentData.shift_id,
//       ];

      
//       con.query(todaysquery, salesValues, (salesErr, salesResult) => {
//         if (salesErr) {
//           console.error('Error inserting shift filetered sales data into the database:', salesErr);
//         } else {
//           console.log('shift filetered pump sales inserted successfully');
//         }
//       });

//       }
//     });
//   });

//   // Insert meter reading data into the pump_meter_reading table
//   const query = `
//   INSERT INTO pump_meter_reading( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id)
//    VALUES(?,?,?,?,?,?)
// `;

//   // const values = formattedData.map((data) => [
//   //   data.cashmeter,
//   //   data.electricmeter,
//   //   data.manualmeter,
//   //   data.pump_id,
//   //   data.allocation_point_id,
//   //   data.shift_id,
//   // ]);

//   formattedData.forEach((data) => {
//     const values = [
//       data.cashmeter,
//       data.electricmeter,
//       data.manualmeter,
//       data.pump_id,
//       data.allocation_point_id,
//       data.shift_id,
//     ];


//   con.query(query, values, (err, result) => {
//     if (err) {
//       console.error('Error inserting data into the database:', err);
//     } else {
//       console.log('pump meter reading inserted successfully');
//     }
//   });
// })
// });


// here


     
        // const updateCapacityQuery = `
        //   UPDATE fuel_capacity_control SET current_capacity = ? 
        //   WHERE content_fuel_product_id IN (
        //     SELECT product_item_id 
        //     FROM product_name 
        //     WHERE product_id = ?
        //   ) AND station_id = ?
        // `;

        // con.query(
        //   updateCapacityQuery,
        //   [
        //     average,
        //     avgpumpId,
        //     station,
        //     station
        //   ],
        //   (updateErr, updateResult) => {
        //     if (updateErr) {
        //       console.error('Error updating fuel capacity:', updateErr);
        //     } else {
        //       console.log('Fuel capacity updated successfully');
        //     }
        //   }
        // );

        //here


// end insert meter reading

// run updates


// app.post('/updatestock', (req, res) => {
//   const {selectedProductId, selectedProductPrice}  = req.body;

//   //const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

//   //const partials = Object.values(formattedData);

//   console.log(selectedProductId,' ',selectedProductPrice);


//     const query =
//        'UPDATE `product_price` SET `product_price`=? WHERE `price_id`=?';

//       //  const alllupdate=`
//       //  UPDATE `product_price` inner join product_name on product_name.product_item_id=product_price.price_product_id inner join stock on stock.stock_product_id=product_name.product_item_id inner join stock_remaining on stock_remaining.stock_product_id=product_name.product_item_id SET product_price.product_price=123, stock_remaining.remaining_stock=300 WHERE product_name.product_item_id=1
//       //  `
//      con.query(query, [selectedProductPrice,selectedProductId], (err, result) => {
//        if (err) {
//            console.error('Error updating price:', err);
//       } else {
//           console.log('Price Updated successfully');
//        }
//    });
// });

// comprehensive stock update


app.post('/updatestock', (req, res) => {
  const { selectedProductId, selectedProductPrice, stationId,selectedcapacity } = req.body;

  const currentTime = moment().format('YYYY-MM-DD');

  console.log('product ',selectedProductId,' price ', selectedProductPrice,' station ',stationId,' capacity', selectedcapacity)

  const checkQuery = `
    SELECT *
    FROM product_price
    INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id
    INNER JOIN stock ON stock.stock_product_id = product_name.product_item_id
    WHERE product_name.product_item_id = ?`;

  con.query(checkQuery, [selectedProductId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('Error checking product:', checkErr);
      return res.status(500).send('Error checking product');
    }

    if (checkResult.length === 0) {
      // Product not found in joined tables, perform an insert
      console.log('Product not found in joined tables, performing insert...',`${selectedProductId}`);

      // Perform your insert logic here
        // Perform your insert logic here
      const insertStockQuery = 'INSERT INTO `stock`(`stock_product_id`, `stock_capacity`, `station_id`, `updated_date`) VALUES (?, ?, ?, ?)';
     
      const insertProductPriceQuery = 'INSERT INTO `product_price`(`product_price`, `price_product_id`) VALUES (?, ?)';

      // Check if the relationship exists in stock table
  const checkStockQuery = 'SELECT * FROM `stock` INNER JOIN product_name ON product_name.product_item_id = stock.stock_product_id WHERE product_name.product_item_id = ?';

  con.query(checkStockQuery, [selectedProductId], (stockCheckErr, stockCheckResult) => {
    if (stockCheckErr) {
      console.error('Error checking stock:', stockCheckErr);
      return res.status(500).send('Error checking stock');
    }

    if (stockCheckResult.length > 0) {
      // Relationship exists, perform an update
      const updateStockQuery = 'UPDATE `stock` SET `stock_capacity`=?, `station_id`=?, `updated_date`=? WHERE `stock_id`=?';
      con.query(updateStockQuery, [selectedcapacity, stationId, currentTime, stockCheckResult[0].stock_id], (updateStockErr, updateStockResult) => {
        if (updateStockErr) {
          console.error('Error updating stock:', updateStockErr);
          return res.status(500).send('Error updating stock');
        }
        console.log('Stock updated successfully');
        // Continue with the rest of the logic
      });
    } else {
      // Relationship doesn't exist, perform the insert
      con.query(insertStockQuery, [selectedProductId, selectedcapacity, stationId, currentTime], (stockErr, stockResult) => {
        if (stockErr) {
          return con.rollback(() => {
            console.error('Error inserting into stock:', stockErr);
            res.status(500).send('Error inserting into stock');
          });
        }
        // Continue with the rest of the logic
      });
    }
  });

  // Check if the relationship exists in product_price table
  const checkProductPriceQuery = 'SELECT * FROM `product_price` INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id WHERE product_name.product_item_id = ?';

  con.query(checkProductPriceQuery, [selectedProductId], (priceCheckErr, priceCheckResult) => {
    if (priceCheckErr) {
      console.error('Error checking product_price:', priceCheckErr);
      return res.status(500).send('Error checking product_price');
    }

    if (priceCheckResult.length > 0) {
      // Relationship exists, perform an update
      const updateProductPriceQuery = 'UPDATE `product_price` SET `product_price`=? WHERE `price_product_id`=?';
      con.query(updateProductPriceQuery, [selectedProductPrice, priceCheckResult[0].price_id], (updatePriceErr, updatePriceResult) => {
        if (updatePriceErr) {
          console.error('Error updating product_price:', updatePriceErr);
          return res.status(500).send('Error updating product_price');
        }
        console.log('Product_price updated successfully');
        // Continue with the response or additional logic
        res.status(200).send('Insert transaction committed successfully');
      });
    } else {
      // Relationship doesn't exist, perform the insert
      con.query(insertProductPriceQuery, [selectedProductPrice, selectedProductId], (priceErr, priceResult) => {
        if (priceErr) {
          return con.rollback(() => {
            console.error('Error inserting into product_price:', priceErr);
            res.status(500).send('Error inserting into product_price');
          });
        }
        // Continue with the response or additional logic
        res.status(200).send('Insert transaction committed successfully');
      });
    }

    
  });
          
      // ...

    } else {
      // Product found in joined tables, perform an update
      console.log('Product found in joined tables, performing update...',`${selectedProductId}`);

        // Perform your update logic here
  const updateQuery = `
  UPDATE product_price
  INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id
  INNER JOIN stock ON stock.stock_product_id = product_name.product_item_id
  SET product_price.product_price=?, stock.stock_capacity=?, stock.station_id=?
  WHERE product_name.product_item_id=?`;

con.query(updateQuery, [parseFloat(selectedProductPrice), parseFloat(selectedcapacity), stationId, selectedProductId], (updateErr, updateResult) => {
  if (updateErr) {
    console.error('Error updating product:', updateErr);
    return res.status(500).send('Error updating product');
  }

  console.log('Product updated successfully');
  res.status(200).send('Product updated successfully');
});
    
    }
  });
});


// update lubs


app.post('/updatelubes', (req, res) => {
  const { selectedProductId,selectedProductPrice, productitemId, stationId,selectedcapacity } = req.body;

  const currentTime = moment().format('YYYY-MM-DD');

  const totalamount=parseFloat(selectedProductPrice)*parseFloat(selectedcapacity);

  let currentclosingdata;

  let partialsalesdata;

  console.log('product ',productitemId,' price ', selectedProductPrice,' station ',stationId,' capacity', selectedcapacity,'total amount ',totalamount)

  // shift

   // console.log('station id ', station, 'and pump is ', formattedData[0].pump_id);
   const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';

   con.query(shiftSql, stationId, (err, shiftResults) => {
     if (err) {
       return res.json(err);
     }
 
     if (shiftResults.length === 0) {
      console.log('No shift records found')
       //return res.json({ error: 'No shift records found' });

     }
 
     const lastShiftId = shiftResults[0].shift_id;
 
  console.log('shift ',lastShiftId);
  
 
  
  //check lsatest  partial sales

  const currentpartialsales="SELECT * FROM `partial_sales` WHERE partial_sales_shift_id=? AND sales_item_id=?";

  con.query(currentpartialsales, [lastShiftId, productitemId], (err, currentResults) => {
    if (err) {
      return res.json(err);
    }

    if (currentResults.length === 0) {
      console.log('No shift records found')
      //return res.json({ error: 'No shift records found' });
    }

     partialsalesdata = currentResults[0].partial_item_quantity;
     console.log('partial sales ',partialsalesdata)
  });

  // end check partial sales

   // select current closing in nonefuel

   const currentclosing="SELECT * FROM `non_fuel_routine_sales` WHERE product_name_id=? AND shift_id=?";

   con.query(currentclosing, [productitemId, lastShiftId], (err, currentResults) => {
     if (err) {
       return res.json(err);
     }
 
     if (currentResults.length === 0) {
       return res.json({ error: 'No shift records found' });
     }
 
      currentclosingdata = currentResults[0].closing_stock;
      console.log('transfered closing is',currentclosingdata)
   });
 
   // 

  const updateQuery = `
  UPDATE partial_sales SET partial_item_quantity=?,total_amount=? WHERE partial_sales_id=? AND station_id=?`

con.query(updateQuery, [selectedcapacity,totalamount, selectedProductId,stationId], (updateErr, updateResult) => {
  if (updateErr) {
    console.error('Error updating product purchases:', updateErr);
   //s return res.status(500).send('Error updating product purchases');
  }

  // update nonefuel 

  if(parseFloat(selectedcapacity) > parseFloat(partialsalesdata))
  {

    const tosub=parseFloat(selectedcapacity)-parseFloat(partialsalesdata)
  
    currentclosingdata=parseFloat(currentclosingdata)- tosub;

    console.log('deducted to ',currentclosingdata);
  }
  else{

    const toadd=parseFloat(partialsalesdata)-parseFloat(selectedcapacity)

    currentclosingdata=parseFloat(currentclosingdata) + toadd;
    console.log('added to ',currentclosingdata);
  }


  const updatenonefuel="UPDATE `non_fuel_routine_sales` SET `closing_stock`=? WHERE `shift_id`=? AND `station_id`=? AND `product_name_id`=?";


  con.query(updatenonefuel, [currentclosingdata, lastShiftId, stationId, productitemId], (updateErr, updateResult) => {
    if (updateErr) {
      console.error('Error updating product:', updateErr);
      return res.status(500).send('Error updating product');
    }
  
    console.log('Product updated successfully');
    res.status(200).send('Product updated successfully');
  
  });


  // update nonefuel table

  //console.log('Product updated successfully');

});

});
      
});





// end comprehenive stoc update

// app.post('/updatestock', (req, res) => {
//   const { selectedProductId, selectedProductPrice } = req.body;

//   const checkQuery = `
//     SELECT *
//     FROM product_price
//     INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id
//     INNER JOIN stock ON stock.stock_product_id = product_name.product_item_id
//     WHERE product_name.product_item_id = ?`;

//   con.query(checkQuery, [selectedProductId], (checkErr, checkResult) => {
//     if (checkErr) {
//       console.error('Error checking product:', checkErr);
//       return res.status(500).send('Error checking product');
//     }

//     if (checkResult.length === 0) {
//       // Product not found in joined tables, perform an insert
//       console.log('Product not found in joined tables, performing insert...',`${selectedProductId}`);

//       // Perform your insert logic here
//       // ...

//     } else {
//       // Product found in joined tables, perform an update
//       console.log('Product found in joined tables, performing update...',`${selectedProductId}`);

//       // const updateQuery = 'UPDATE `product_price` SET `product_price`=? WHERE `price_id`=?';
//       // con.query(updateQuery, [selectedProductPrice, selectedProductId], (updateErr, updateResult) => {
//       //   if (updateErr) {
//       //     console.error('Error updating price:', updateErr);
//       //     return res.status(500).send('Error updating price');
//       //   }

//       //   console.log('Price updated successfully');
//       //   res.status(200).send('Price updated successfully');
//       // });
//     }
//   });
// });

// run updates





// attach assets to station
app.post('/attachstationassets', (req, res) => {
const { selectedstations, selectedpump, selectedtanks, selectedallocationpoints,selectedsupervisors } = req.body;


  if (!selectedtanks || !selectedpump || !selectedallocationpoints || !selectedsupervisors || !selectedstations ) {
  return res.status(400).json({ message: 'Invalid registration data' });
}

console.log('tapped');
con.beginTransaction((err) => {
  if (err) {
    console.log('Transaction start failed:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }

  const loginSql = 'INSERT INTO `station_asset_attachment`(`station_tank_id`, `station_pump_id`, `allocation_point_id`, `station_supervisor_id`, `station_station_id`) VALUES (?,?,?,?,?)';
      con.query(loginSql, [selectedtanks, selectedpump,selectedallocationpoints,selectedsupervisors,selectedstations], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to register tank:', loginErr);
            return res.status(500).json({ message: 'Registration failed' });
          });
  
        }

        con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Registration failed' });
              });
            }

            console.log('Registration successful');
            return res.status(200).json({ message: 'Registration successful' });
        });
      });
});
});
// . end assets to station
  

//  view station
app.get('/viewstation', (req, res) => {
  const sql = 'SELECT * FROM station';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view station

//  view vendors
app.get('/viewvendors', (req, res) => {
  const sql = 'SELECT * FROM vendor';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view vendors

//  view customers
app.get('/viewcustomers', (req, res) => {
  const sql = 'SELECT * FROM customers';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view customers

//  view cashiers
app.get('/viewcashiers', (req, res) => {
  const sql = 'SELECT * FROM cashier';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view cashiers

//  view Supervisor
app.get('/viewsupervisors', (req, res) => {
  const sql = 'SELECT * FROM supervisor inner join supervisor_allocation on supervisor.supervisor_id=supervisor_allocation.allocation_supervisor_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view Supervisor

//  view purchase type
app.get('/viewpurchasetype', (req, res) => {
  const sql = 'SELECT * FROM product_type';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view purchase type

// //  view island/allocation point
// app.get('/viewallocationpoint', (req, res) => {
//   const sql = 'SELECT allocation_point.* FROM allocation_point LEFT JOIN pump_island on pump_island.island_id=allocation_point.allocation_point_id WHERE pump_island.island_id IS NULL';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
// //. end view island/ allocation point 

//  view island/allocation point
app.get('/viewallocationpoint', (req, res) => {
  const sql = 'SELECT * FROM allocation_point LEFT JOIN pump_island on pump_island.island_id=allocation_point.allocation_point_id ';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/ allocation point 


//  view island/allocation point
app.get('/viewallocationpoints', (req, res) => {
  const sql = 'SELECT * FROM allocation_point inner join island_allocation on allocation_point.allocation_point_id=island_allocation.allocation_island_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/ allocation point 

//  view island/allocation point
app.get('/viewaislandpoint', (req, res) => {
  const sql = 'SELECT allocation_point.* FROM allocation_point LEFT JOIN pump_island on pump_island.island_id=allocation_point.allocation_point_id order by allocation_point.allocation_point_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/ allocation point

//  view island/allocation point
app.get('/viewpumpsallocation', (req, res) => {
  const sql = 'SELECT * FROM allocation_point inner join pump_island on pump_island.island_id=allocation_point.allocation_point_id inner join pump on pump.pump_id=pump_island.pump_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view island/ allocation point 

//  view item
app.get('/viewitem', (req, res) => {
  const sql = 'SELECT * FROM product_name inner join product_price on product_name.product_item_id = product_price.price_product_id inner join stock on stock.stock_product_id=product_name.product_item_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view item

//  view item
app.get('/viewproducttype', (req, res) => {
  const sql = 'SELECT * FROM `product_type`';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view item

//  view paymentmode
app.get('/viewpaymentmode', (req, res) => {
  const sql = 'SELECT * FROM payment_mode';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view paymentmode

//  view paymentmethods
app.get('/viewpaymentmethods', (req, res) => {
  const sql = 'SELECT * FROM payment_methods';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view paymentmethods

//  view bank
app.get('/viewbank', (req, res) => {
  const sql = 'SELECT * FROM bank_accounts';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view bank

//fuel meters
app.get('/viewfuelmeters', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }


    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;
console.log(lastShiftId)
   // return res.json('last shift id '+lastShiftId);

const sql = `SELECT * FROM fuel_capacity_control inner JOIN product_name ON product_name.product_item_id = fuel_capacity_control.content_fuel_product_id inner JOIN product_classes ON product_classes.product_class_id = product_name.product_item_class_id where product_classes.product_class = 'fuel' and fuel_capacity_control.shift_id = ?`;

con.query(sql, [lastShiftId], (err, routineResults) => {
  if (err) {
    return res.json(err);
  }
  
  // Return the results from routine_cashier
  return res.json(routineResults);
});
});
});
//. end view fuel meters

//nonfuel forecourt
app.get('/nonfuelforecourt', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;
console.log(lastShiftId)
   // return res.json('last shift id '+lastShiftId);

const sql = `SELECT * FROM partial_sales inner join product_name on product_name.product_item_id = partial_sales.sales_item_id inner join routine_cashier_island on routine_cashier_island.cashier_island_id = partial_sales.partial_routine_cashier_island inner join routine_cashier on routine_cashier.routine_id = routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id = routine_cashier.routine_cashier_id inner join allocation_point on allocation_point.allocation_point_id = routine_cashier_island.routine_allocation_id where partial_sales.partial_sales_shift_id = ?; `;

con.query(sql, [lastShiftId], (err, routineResults) => {
  if (err) {
    return res.json(err);
  }
  
  // Return the results from routine_cashier
  return res.json(routineResults);
});
});
});
//. end nonfuel forecourt       

//  view invoice sales
app.get('/viewinvoicesales', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }
      // Check if there are any shift records
      if (shiftResults.length === 0) {
        return res.json({ error: 'No shift records found' });
      }
  
      // Get the ID of the last shift
      const lastShiftId = shiftResults[0].shift_id;
  
     // return res.json('last shift id '+lastShiftId);

     
  const routineSql = 'SELECT allocation_point.allocation_desc AS island, allocation_point.allocation_point_id AS island_id, SUM(total_amount) AS total FROM `sales` inner join sales_desc on sales.sales_desc_id=sales_desc.sales_desc_id inner join invoice_sales_details on invoice_sales_details.actual_sales_id=sales.sales_id inner join shift on shift.shift_id=sales.sales_shift_id inner join allocation_point on allocation_point.allocation_point_id=sales.island_id where shift_id = ? GROUP BY allocation_point.allocation_point_id';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view invoice sales

//  view reconciliation
app.get('/viewreconciliation', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;
 console.log('last shift ',lastShiftId)
   // return res.json('last shift id '+lastShiftId);
  const sql = 'SELECT * FROM `reconcilliation` inner join station on station.station_id = reconcilliation.station_id inner join supervisor on supervisor.supervisor_id = reconcilliation.supervisor where reconcilliation.shift_id = ?';
  con.query(sql, lastShiftId,(err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
  });
});
//. end view reconciliation

//  view credit sales
app.get('/viewcreditsales', (req, res) => {

 station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }
    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);


  const routineSql = 'SELECT allocation_point.allocation_desc AS island, allocation_point.allocation_point_id AS island_id, SUM(total_amount) AS total FROM sales INNER JOIN sales_desc ON sales.sales_desc_id = sales_desc.sales_desc_id INNER JOIN credit_sale_details ON credit_sale_details.actual_sales_id = sales.sales_id INNER JOIN shift ON shift.shift_id = sales.sales_shift_id INNER JOIN allocation_point ON allocation_point.allocation_point_id = sales.island_id WHERE shift_id = ? GROUP BY allocation_point.allocation_point_id';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});
//  view vendor
app.get('/viewvendor', (req, res) => {
  const sql = 'SELECT * FROM  vendor inner join vendor_account on vendor.vendor_id=vendor_account.vendor_acc_vendor_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view  vendor


//  view shift partial sales
app.get('/partialnpumpreading', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

 // const routineSql = 'SELECT p.cash_meter, p.island AS fuel_island_id, p.fuel_island, p.fuel_routine_shift, p.fuel_reading_shift, n.non_fuel_island,n.partial_island_id, SUM(n.non_fuel_price),n.cashier_first_name, SUM(n.non_fuel_price) as none_fuel, COALESCE(CAST(p.cash_meter AS SIGNED), 0) + SUM(n.non_fuel_price) AS grandtotal, n.non_fuel_routine_shift FROM ( SELECT cash_meter, island,allocation_desc AS fuel_island,shift_id AS fuel_routine_shift, reading_shift_id AS fuel_reading_shift FROM pump_meter_reading INNER JOIN allocation_point ON allocation_point.allocation_point_id = pump_meter_reading.island INNER JOIN shift ON shift.shift_id = pump_meter_reading.reading_shift_id WHERE shift.shift_id = ? ) AS p LEFT JOIN ( SELECT allocation_desc AS non_fuel_island, partial_sold_sales_price AS non_fuel_price,partial_sales_shift_id AS non_fuel_sales_shift, shift_id AS non_fuel_routine_shift,partial_island_id,cashier.cashier_first_name FROM partial_sales INNER JOIN routine_cashier_island ON routine_cashier_island.cashier_island_id = partial_sales.partial_routine_cashier_island INNER JOIN allocation_point ON allocation_point.allocation_point_id = routine_cashier_island.routine_allocation_id INNER JOIN routine_cashier ON routine_cashier.routine_id = routine_cashier_island.routine_cashier_id INNER JOIN cashier ON cashier.cashier_id = routine_cashier.routine_cashier_id INNER JOIN shift ON shift.shift_id = partial_sales.partial_sales_shift_id WHERE shift.shift_id = ?) AS n ON p.fuel_island = n.non_fuel_island GROUP BY p.cash_meter,p.island,p.fuel_island,p.fuel_routine_shift,p.fuel_reading_shift,n.non_fuel_island,n.partial_island_id,n.non_fuel_sales_shift,n.non_fuel_routine_shift,n.cashier_first_name';
 const routineSql='SELECT cash_meter AS meter_reading, NULL AS partial_sales_price,NULL AS cashier_first_name, allocation_desc AS island, allocation_point_id AS pump_island_id, shift_id AS routine_shift,reading_shift_id AS reading_shift FROM pump_meter_reading INNER JOIN allocation_point ON allocation_point.allocation_point_id = pump_meter_reading.island inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id WHERE shift.shift_id = ? UNION ALL SELECT NULL AS meter_reading, partial_sold_sales_price AS partial_sales_price, cashier.cashier_first_name,allocation_desc AS island, allocation_point_id AS partial_island_id, partial_sales_shift_id AS routine_shift, shift_id AS reading_shift FROM partial_sales INNER JOIN routine_cashier_island ON routine_cashier_island.cashier_island_id = partial_sales.partial_routine_cashier_island INNER JOIN allocation_point ON allocation_point.allocation_point_id = routine_cashier_island.routine_allocation_id INNER JOIN routine_cashier ON routine_cashier.routine_id = routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join shift on shift.shift_id=routine_cashier.routine_shift_id WHERE shift.shift_id = ?'
 con.query(routineSql, [lastShiftId,lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view  shift partial sales


// combined partiala nd pump meter reading data for this shift

//  view shift partial sales
app.get('/viewpartialsales', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

  const routineSql = 'SELECT allocation_point_id AS island_id, allocation_desc as island, cashier_id,shift_id, cashier_first_name as cashiername, SUM(total_amount) AS total, partial_sales_shift_id as shift_id FROM partial_sales INNER JOIN allocation_point ON partial_sales.partial_island_id = allocation_point.allocation_point_id INNER JOIN routine_cashier_island ON routine_cashier_island.cashier_island_id = partial_sales.partial_routine_cashier_island INNER JOIN routine_cashier ON routine_cashier_island.routine_cashier_id = routine_cashier.routine_id INNER JOIN cashier ON cashier.cashier_id = routine_cashier.routine_cashier_id INNER JOIN shift ON shift.shift_id = routine_cashier.routine_shift_id WHERE shift_id = ? GROUP BY allocation_point_id';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view  shift partial sales


// end combine data for pump meter and partial sales per shift


//  view shift pump reading
app.get('/viewpumpreading', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

    //const lastShiftId=129;

   // recontsturn res.json('last shift id '+lastShiftId);

 // const routineSql = 'SELECT Distinct allocation_point_id as island_id, shift_id, allocation_desc as island, cash_meter as cash, electric_meter as electric, manual_meter as manual FROM `pump_meter_reading` inner join allocation_point on pump_meter_reading.island=allocation_point.allocation_point_id inner join pump on pump_meter_reading.pump_id= pump.pump_id inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id WHERE shift.shift_id=? ORDER BY allocation_point_id';
 
  const routineSql= 'SELECT cashier_first_name as cashiername, allocation_point_id as island_id, shift_id, allocation_desc as island, cash_meter as cash, electric_meter as electric, manual_meter as manual FROM `pump_meter_reading` inner join allocation_point on pump_meter_reading.island=allocation_point.allocation_point_id inner join pump on pump_meter_reading.pump_id= pump.pump_id inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=allocation_point.allocation_point_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id WHERE shift_id=? and routine_cashier.routine_shift_id=?';
  con.query(routineSql, [lastShiftId,lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view pump reading

//  view shift pump reading
app.get('/viewshiftpumpreading', (req, res) => {

 station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

    //const lastShiftId=129;

   // recontsturn res.json('last shift id '+lastShiftId);

 // const routineSql = 'SELECT Distinct allocation_point_id as island_id, shift_id, allocation_desc as island, cash_meter as cash, electric_meter as electric, manual_meter as manual FROM `pump_meter_reading` inner join allocation_point on pump_meter_reading.island=allocation_point.allocation_point_id inner join pump on pump_meter_reading.pump_id= pump.pump_id inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id WHERE shift.shift_id=? ORDER BY allocation_point_id';
 
  const routineSql= 'SELECT cashier_first_name as cashiername, allocation_point_id as island_id, shift_id, allocation_desc as island, cash_meter as cash, electric_meter as electric, manual_meter as manual FROM `shift_pump_sales` inner join allocation_point on shift_pump_sales.island=allocation_point.allocation_point_id inner join pump on shift_pump_sales.pump_id= pump.pump_id inner join shift on shift.shift_id=shift_pump_sales.reading_shift_id inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=allocation_point.allocation_point_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id WHERE shift_id=? and routine_cashier.routine_shift_id=?';
  con.query(routineSql, [lastShiftId,lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view shift pump reading

// add product
app.post('/addproduct', (req, res) => {
  const {selectedproducttype,selectedproductclass, productname,productprice,stock,tax,stationId} = req.body;
  console.log(selectedproducttype+' ::'+selectedproductclass+' ::'+ productname+' ::'+productprice+' ::'+tax);

  const currentDate = new Date().toLocaleDateString();

  const qty = 15;
 
  // if (!pumpid || !meterdesc ) {
  //   return res.status(400).json({ message: 'Invalid registration data' });
  // }
  
  console.log('tapped');
  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: ' failed to add product' });
    }

    const loginSql = 'INSERT INTO `product_name`( `product_item`, `product_item_class_id`, `product_qty`) VALUES (?,?,?)';
    con.query(loginSql, [productname, selectedproductclass,qty ], (loginErr, loginResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to register pump:', loginErr);
          return res.status(500).json({ message: ' failed to add product' });
        });
 
      }
      const loginId = loginResult.insertId;
      // from here
      const loginSql = 'INSERT INTO `product_price`( `product_price`, `price_product_id`) VALUES (?,?)';
      con.query(loginSql, [productprice, loginId], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to register pump:', loginErr);
            return res.status(500).json({ message: ' failed to add product' });
        });
      }

      //second qry

      //third query

      const remainingSql = 'INSERT INTO `stock_remaining`(`remaining_stock`, `stock_product_id`, `station_id`, `updated_date`) VALUES (?,?,?,?)';

      const stockSql = 'INSERT INTO `stock`(`stock_product_id`, `stock_capacity`, `station_id`, `updated_date`)  VALUES (?,?,?,?)';
     
     
      con.query(remainingSql, [stock, loginId, stationId, currentDate], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to insert remaining products:', loginErr);
            return res.status(500).json({ message: ' failed to add product' });
        });
      }

      // here 

      con.query(stockSql, [ loginId,stock, stationId, currentDate], (loginErr, loginResult) => {
        if (loginErr) {
          con.rollback(() => {
            console.log('Failed to insert remaining products:', loginErr);
            return res.status(500).json({ message: ' failed to add product' });
        });
      }

      con.commit((commitErr) => {
        if (commitErr) {
          con.rollback(() => {
            console.log('Transaction commit failed:', commitErr);
            return res.status(500).json({ message: ' failed to add product' });
          });
        }

        console.log('Product added successfuly');
        return res.status(200).json({ message: 'Product added successfuly' });

    })

    })


      // to here

      //end third query
    
    });
      //second qry
    });
      // to here

      
  });
  });
});

//end add product


//  view fuel meters
// app.get('/viewfuelsales', (req, res) => {
//   const sql = 'SELECT * FROM `pump_meter_reading` inner join routine_cashier on pump_meter_reading.reading_shift_id=routine_cashier.routine_shift_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id where pump_meter_reading.reading_shift_id=48';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
//. end view fuel meters

// //  view dips
// app.get('/viewfuelsales', (req, res) => {
//   const sql = 'SELECT * FROM `pump_meter_reading` inner join routine_cashier on pump_meter_reading.reading_shift_id=routine_cashier.routine_shift_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id where pump_meter_reading.reading_shift_id=48';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
// //. end view fuel meters

//  view none fuel purchase.. not compelte
app.get('/viewpurchase', (req, res) => {
  const sql = 'SELECT * FROM `purchases` inner join purchase_details on purchase_details.purchase_id = purchases.purchase_details_id inner join purchase_invoice on purchase_invoice.invoice_id = purchase_details.purchase_invoice_id inner join vehicle on vehicle.vehicle_id = purchase_details.purchase_veh_id inner join cashier on cashier.cashier_id = purchase_details.cashier_id inner join product_name on product_name.product_item_id = purchase_details.product_name_product_id inner join vendor on vendor.vendor_id = purchase_details.vendor_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view nonfuel purchase

//  view vendor payments.. not compelte
app.get('/viewpayment', (req, res) => {
  const sql = 'SELECT * FROM `transaction` inner join vendor_payment on vendor_payment.vendor_transaction_id= transaction.transaction_id inner join cashier on cashier.cashier_id = transaction.transaction_cashier_id inner join vendor on vendor.vendor_id = transaction.transaction_vendor_id inner join vendor_account on vendor_account.vendor_account_id = vendor_payment.vendor_payment_vendor_acc_id inner join payment_methods on payment_methods.payment_method_id = transaction.transaction_payment_method_id inner join payment_mode on payment_mode.payment_mode_id = payment_methods.payment_mode_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view  vendor payments

// //  view products and stocks
// app.get('/viewfuels', (req, res) => {
//   const sql = 'SELECT * FROM `tank_content` inner join product_name on product_name.product_item_id=tank_content.tank_content_product_id inner join tank on tank.tank_id=tank_content.tank_id inner join dip on dip.dip_tank_content_id=tank_content.tank_content_id';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
// //. end view  products and stocks

//  view products and stocks
app.get('/viewfuels', (req, res) => {
  const sql = `SELECT * FROM product_name inner join product_classes on product_name.product_item_class_id=product_classes.product_class_id left join fuel_capacity_control on product_name.product_item_id=fuel_capacity_control.content_fuel_product_id where product_classes.product_class='fuel'`;
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view  products and stocks

//  view productclass
app.get('/productclass', (req, res) => {
  const sql = 'SELECT * FROM product_classes';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view productclass

 //  view Document Total(credit sales)
 app.get('/documenttotal', (req, res) => {
  const sql = 'Select * from credit_sale_details inner join sales on sales.sales_id=credit_sale_details.actual_sales_id inner join cashier on cashier.cashier_id=sales.routine_cashier inner join product_name on product_name.product_item_id=sales.sales_product_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end Document Total(credit sales)

 //  view item sold sales (invoice sales)
 app.get('/viewitemsold', (req, res) => {
  const sql = 'Select * from invoice_sales_details inner join sales on sales.sales_id=invoice_sales_details.actual_sales_id inner join cashier on cashier.cashier_id=sales.routine_cashier inner join product_name on product_name.product_item_id=sales.sales_product_id inner join customers on customers.customer_id=invoice_sales_details.customer_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end item sold sales (invoice sales)

 //  view transfer
 app.get('/viewtransfer', (req, res) => {
  const sql = 'SELECT * FROM stock_transfer';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view shift 

// update product price, tax....


//. end update product price, tax...

//  view products and stocks
// app.get('/viewnonfuels', (req, res) => {



//   const sql = 'SELECT * FROM `stock` inner join product_name on product_name.product_item_id=stock.stock_product_id inner join product_classes on product_classes.product_class_id=product_name.product_item_class_id inner join product_type on product_type.product_type_id=product_classes.product_type_id';
//   con.query(sql, (err, results) => {
//     if (err) {
//       return res.json(err);
//     }
//     return res.json(results);
//   });
// });
app.get('/viewnonfuell', (req, res) => {
  const sql = `
  SELECT s.*, pn.product_item AS product_name, pc.*, pt.*
  FROM (
    SELECT stock_product_id, MAX(shift_id) AS max_shift
    FROM stock
    GROUP BY stock_product_id
  ) AS max_shifts
  INNER JOIN stock AS s ON max_shifts.stock_product_id = s.stock_product_id AND max_shifts.max_shift = s.shift_id
  INNER JOIN product_name AS pn ON s.stock_product_id = pn.product_item_id
  INNER JOIN product_classes AS pc ON pn.product_item_class_id = pc.product_class_id
  INNER JOIN product_type AS pt ON pc.product_type_id = pt.product_type_id
  
  `;

  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});

app.get('/viewnonfuels', (req, res) => {
  const sql = `
  SELECT * FROM product_name INNER JOIN product_classes ON product_classes.product_class_id = product_name.product_item_class_id LEFT JOIN stock ON stock.stock_product_id = product_name.product_item_id LEFT JOIN stock_remaining ON stock_remaining.stock_product_id = product_name.product_item_id LEFT JOIN product_price ON product_price.price_product_id = product_name.product_item_id WHERE product_classes.product_class != 'fuel'
  `;

  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});



//. end view  products and stocks

//  view nonfuelforecourt
app.get('/viewnonfuelforecourt', (req, res) => {
  const sql = 'SELECT * FROM non_fuel_routine_sales';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view nonfuelforecourt

//cashier allocation point

app.get('/cashierallocation', (req, res) => {
  // Select final shift to get its ID
  const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, (err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
    const routineSql = 'SELECT * FROM `routine_cashier_island` inner join routine_island on routine_island.routine_id=routine_cashier_island.routine_allocation_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join shift on shift.shift_id=routine_island.routine_shift_id where shift.shift_id=?';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

//cashier allocatiopn point

app.get('/cashierproduct', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

    // Select records from routine_cashier using the last shift's ID
    const routineSql = 'SELECT * FROM `routine_cashier_type` inner join product_type on product_type.product_type_id = routine_cashier_type.product_type_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_type.type_routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id';
    con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});

//end cashier product


// assets allocations
app.post('/attachassets', (req, res) => {
  const { selectedallocationpoints, selectedpump, selectedsupervisors,selectedtanks,selectedstations } = req.body;

  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  const supervisor = Object.values(selectedsupervisors);
  const tanks = Object.values(selectedtanks);
  const pump = Object.values(selectedpump);
  const allocation = Object.values(selectedallocationpoints);

  const station=selectedstations

  console.log(selectedsupervisors)

  supervisor.forEach((item) => {
      const supervisor_id = item;
      

  //console.log('items is'+item+' and station is'+station)
  
  // supervisor allocation
    const query =
      'INSERT INTO `supervisor_allocation`(`allocation_supervisor_id`, `allocation_station_id`) VALUES (?,?)';

    con.query(query, [supervisor_id,station ], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('supervisor attached successfully');
      }
    });
  });
  //end supervisor allocation

  // pumps allocation
  pump.forEach((item) => {
      const pump_id = item;

  console.log(item)
    const query =
      'INSERT INTO `pump_allocation`( `allocation_pump_id`, `allocation_station_id`) VALUES (?,?)';

    con.query(query, [pump_id, station], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('pumps allocated successfully');
      }
    });
  });
  //end pumps allocation

  // tanks allocation
  tanks.forEach((item) => {
      const tank_id = item;

  console.log(item)
    const query =
      'INSERT INTO `tank_allocation`( `allocation_tank_id`, `allocation_station_id`) VALUES (?,?)';

     con.query(query, [tank_id, station], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('tank allocated successfully');
      }
    });
  });
  // end tanks allocation

  // island allocation
  allocation.forEach((item) => {
      const island_id = item;

  console.log(item)
    const query =
      'INSERT INTO `island_allocation`( `allocation_island_id`, `allocation_station_id`) VALUES (?,?)';

      con.query(query, [island_id, station], (error, results) => {   
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('island allocated successfully');
      }
    });
  });
  //end island allocation

});
//. end assets allocation


// combining pump n tank

app.post('/tankpump', (req, res) => {
  const { selectedpumps, selectedtank } = req.body;

  console.log('selected pumps ',selectedpumps,' selected tanks ',selectedtank);
  let station_id=1;

  selectedpumps.forEach((pump_id) => {

    console.log(pump_id);
    
//console.log('items is'+item+' and station is'+station)

// tank allocation
  const query =
    'INSERT INTO `tank_pump`(`tank_id`, `pump_id`, `station_id`) VALUES (?,?,?)';

  con.query(query, [selectedtank,pump_id,station_id ], (error, results) => {
    if (error) {
      console.error('Error inserting data:', error);
    } else {
      console.log('pump n tank allocated successfully');
    }
  });
});
//end tanks alloaction



});

// end attachinmg pumptank


// islandcashier

//islandcashier
app.post('/islandcashier', (req, res) => {
  const { selectedallocationpoints,selectedcashiers, selectedpumpisland} = req.body;

    //const cashiers = Object.values(selectedcashier);
    const allocation = Object.values(selectedallocationpoints);
    const pumpisland = Object.values(selectedpumpisland);
    const cashier_id= selectedcashiers;   

    console.log('selected cashier '+selectedcashiers+'\n selected island \n'+selectedallocationpoints);                       

  con.beginTransaction((err) => {
  if (err) {
    console.log('Transaction start failed:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }

  // island cashier allocation
  allocation.forEach((item) => {
      const island_id = item;

  console.log(item)
    const query =
      'INSERT INTO `routine_cashier_island`( `routine_allocation_id`, `routine_cashier_id`) VALUES (?,?)';

      con.query(query, [island_id, cashier_id], (error, results) => {   
      if (error) {
        console.error('island attachment error:', error);
      } else {
        console.log('island staff allocated successfully');
      }
    });
  });


    // island pump
    pumpisland.forEach((item) => {
      const island_id = item;

  console.log(item)
    const query =
      'INSERT INTO `routine_islandpump_cashier`(`cashier_routine_id`, `pump_routine_id`) VALUES (?,?)';

      con.query(query, [cashier_id,island_id], (error, results) => {   
      if (error) {
        console.error('island attachment error:', error);
      } else {
        console.log('island staff allocated successfully');
      }
    });
  });



        con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Registration failed' });
              });
            }

            console.log('Shift creation success');
            return res.status(200).json({
              message: 'Transfer successful',
              selectedcashiers: selectedcashiers,
              selectedallocationpoints: selectedallocationpoints,
            });
            
        });

      });
    });

    //fin allocation
app.post('/finallocation', (req, res) => {
  const { selectedallocationpoints,selectedcashiers, selectedpumpisland} = req.body;

  const allocation = Object.values(selectedallocationpoints);
  const pumpisland = Object.values(selectedpumpisland);
   const cashier_id= selectedcashiers;   

  con.beginTransaction((err) => {
  if (err) {
    console.log('Transaction start failed:', err);
    return res.status(500).json({ message: 'Error occured failed' });
  }

    // Select final shift to get its ID
    const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
    con.query(shiftSql, (err, shiftResults) => {
      if (err) {
        return res.json(err);
      }
  
      // Check if there are any shift records
      if (shiftResults.length === 0) {
        return res.json({ error: 'No shift records found' });
      }
  
      // Get the ID of the last shift
      const lastShiftId = shiftResults[0].shift_id;
  

  // island cashier allocation
  allocation.forEach((item) => {
      const island_id = item;

  console.log(item)
    const query =
      'INSERT INTO `routine_cashier_island`( `routine_allocation_id`, `routine_cashier_id`) VALUES (?,?)';

      con.query(query, [island_id, cashier_id], (error, results) => {   
      if (error) {
        console.error('cashier island attachment error:', error);
      } else {
        console.log('island cashier allocated successfully');
      }
    });
  });


    // island pump
    pumpisland.forEach((item) => {
    //  const island_id = item;
      const {allocation_point_id, pump_id}=item;
      console.log('the pump id is ',allocation_point_id)

      const query1 =
      'SELECT * FROM `pump_routine` inner join pump on pump.pump_id= pump_routine.routine_pump_id inner join pump_island on pump_island.pump_id=pump.pump_id inner join allocation_point on allocation_point.allocation_point_id=pump_island.island_id where pump_routine.shift_id=? AND allocation_point_id=? ';
      con.query(query1, [lastShiftId, allocation_point_id], (error, results) => { 
        if (error) {
          console.error('routine island pump cashier attachment error:', error);
        }
        else {
         
          results.forEach((result) => {
            console.log(result.pump_id);
            const query =
            'INSERT INTO `routine_islandpump_cashier`(`cashier_routine_id`, `pump_routine_id`) VALUES (?,?)';
      
            con.query(query, [cashier_id,result.pump_id], (error, results) => {   
              if (error) {
                console.error('routine island pump cashier attachment error:', error);
              } else {
                console.log('routine island pump cashier');
              }
            
            });
          });
  

  }
  });
  });


        con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Registration failed' });
              });
            }

            console.log('Shift creation success');
            return res.status(200).json({
              message: 'Transfer successful',
              selectedcashiers: selectedcashiers,
              selectedallocationpoints: selectedallocationpoints,
            });
            
        });

      });
    });
    });
//end  fin allocation


//transfer island allocation

// app.post('/islandtransfer', (req, res) => {
//   const {selectedproductnames,quantity,routineisland} = req.body;

//   const island_id = routineisland;
//   const closing = 15;

//   con.beginTransaction((err) => {
//     if (err) {
//       console.log('Transaction start failed:', err);
//       return res.status(500).json({ message: 'Transaction start failed' });
//     }

//     const insertProductData = (productIndex) => {
//       if (productIndex >= selectedproductnames.length) {
//         con.commit((err) => {
//           if (err) {
//             console.log('Transaction commit failed:', err);
//             return con.rollback(() => {
//               res.status(500).json({ message: 'Registration failed' });
//             });
//           }
//           console.log('Transaction committed.');
//           return res.status(200).json({ message: 'Transaction committed' });
//         });
//         return;
//       }

//       const product_id = selectedproductnames[productIndex];
//       const lastClosingQuery = 'SELECT closing_stock AS last_closing FROM non_fuel_routine_sales WHERE product_name_id =? ORDER BY sales_id DESC LIMIT 1';
//       con.query(lastClosingQuery, [product_id], (error, lastClosingResult) => {
//         if (error) {
//           console.error('Error querying last closing stock:', error);
//           con.rollback(() => {
//             res.status(500).json({ message: 'Error querying last closing stock' });
//           });
//         } else {
//           const lastClosing = lastClosingResult[0]?.last_closing || 0;
//           let productQuantity = quantity[product_id];
//           productQuantity = parseInt(productQuantity, 10);
//           const openingStock = lastClosing + productQuantity;

//           const insertQuery =
//             'INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock,`Total_stock`,  closing_stock) VALUES (?, ?, ?, ?,?, ?)';

//           con.query(insertQuery, [product_id, island_id,lastClosing,productQuantity,openingStock, closing], (error) => {
//             if (error) {
//               console.error('Error inserting new row:', error);
//               con.rollback(() => {
//                 res.status(500).json({ message: 'Error inserting new row' });
//               });
//             } else {
//               insertProductData(productIndex + 1); // Move to the next product
//             }
//           });
//         }
//       });
//     };

//     insertProductData(0); // Start inserting from the first product
//   });
// });

//reconcillition trial

// trial island transfer......................................................................................................................

// app.post('/islandtrans', (req, res) => {
//   const { selectedproductnames, quantity, routineisland } = req.body;
//   const island_id = routineisland;
//   const closing = 15;

//   console.log('quantity is ',quantity)

//   con.beginTransaction((err) => {
//     if (err) {
//       console.log('Transaction start failed:', err);
//       return res.status(500).json({ message: 'Transaction start failed' });
//     }

//     // Check the current shift
//     const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
//     con.query(shiftSql, (err, shiftResults) => {
//       if (err) {
//         return res.json(err);
//       }

//       // Check if there are any shift records
//       if (shiftResults.length === 0) {
//         return res.json({ error: 'No shift records found' });
//       }

//       const lastShiftId = shiftResults[0].shift_id;

//       // Function to check if a product exists in the current shift
//       const doesProductExistInShift = (product_id, callback) => {
//         const checkProductQuery = `
//           SELECT * FROM non_fuel_routine_sales
//           WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ?
//           ORDER BY sales_id DESC LIMIT 1`;

//         con.query(checkProductQuery, [product_id, island_id, lastShiftId], (error, checkProductResult) => {
//           if (error) {
//             console.error('Error checking product:', error);
//             return callback(false); // Assume product doesn't exist on error
//           } else {
//             return callback(checkProductResult.length > 0); // Return true if product exists, false otherwise
//           }
//         });
//       };

//       const insertOrUpdateProduct = (productIndex) => {
//         if (productIndex >= selectedproductnames.length) {
//           con.commit((err) => {
//             if (err) {
//               console.log('Transaction commit failed:', err);
//               return con.rollback(() => {
//                 res.status(500).json({ message: 'Registration failed' });
//               });
//             }
//             console.log('Transaction committed.');
//             return res.status(200).json({ message: 'Transaction committed' });
//           });
//           return;
//         }

//         const product_id = selectedproductnames[productIndex];

//         // Check if the product exists in the current shift
//         doesProductExistInShift(product_id, (productExists) => {
//           if (productExists) {
//             // Product exists in the current shift; update the added_stock
//             const lastClosingQuery = `
//               SELECT closing_stock AS last_closing, added_stock, Total_stock
//               FROM non_fuel_routine_sales
//               WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ?
//               ORDER BY sales_id DESC LIMIT 1`;

//             con.query(lastClosingQuery, [product_id, island_id, lastShiftId], (error, lastClosingResult) => {
//               if (error) {
//                 console.error('Error querying last closing stock:', error);
//                 con.rollback(() => {
//                   res.status(500).json({ message: 'Error querying last closing stock' });
//                 });
//               } else {
//                 const lastClosing = lastClosingResult[0]?.last_closing || 0;
//                 let productQuantity = quantity[product_id];
//                 productQuantity = parseInt(productQuantity, 10);
//                 const addedStock = lastClosingResult[0].added_stock + productQuantity;
//                 const totalstock=lastClosingResult[0].Total_stock + productQuantity;

//                 console.log('total stock is ',totalstock,' added stock ',lastClosingResult[0].added_stock)

//                 const updateQuery = `
//                   UPDATE non_fuel_routine_sales
//                   SET added_stock = ?, Total_stock = ?, closing_stock = ?
//                   WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ?`;

//                 con.query(
//                   updateQuery,
//                   [addedStock, totalstock, closing, product_id, island_id, lastShiftId],
//                   (error) => {
//                     if (error) {
//                       console.error('Error updating existing product:', error);
//                       con.rollback(() => {
//                         res.status(500).json({ message: 'Error updating existing product' });
//                       });
//                     } else {
//                       insertOrUpdateProduct(productIndex + 1); // Move to the next product
//                     }
//                   }
//                 );
//               }
//             });
//           } else {
//             // Product doesn't exist in the current shift; insert a new row
//             const lastClosing = 0; // Change this if needed
//             let productQuantity = quantity[product_id];
//             productQuantity = parseInt(productQuantity, 10);
//             const openingStock = lastClosing + productQuantity;

//             const insertQuery = `
//               INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, Total_stock, closing_stock, shift_id)
//               VALUES (?, ?, ?, ?, ?, ?, ?)`;

//             con.query(
//               insertQuery,
//               [product_id, island_id, lastClosing, productQuantity, openingStock, closing, lastShiftId],
//               (error) => {
//                 if (error) {
//                   console.error('Error inserting new row:', error);
//                   con.rollback(() => {
//                     res.status(500).json({ message: 'Error inserting new row' });
//                   });
//                 } else {
//                   insertOrUpdateProduct(productIndex + 1); // Move to the next product
//                 }
//               }
//             );
//           }
//         });
//       };

//       insertOrUpdateProduct(0); // Start inserting/updating from the first product
//     });
//   });
// });

// end island transfer ...................................................................................................................

 //transfer customer products

  
    //nonefuel island allocation


    // trial

    // app.post('/islandtrans', (req, res) => {
    //   const { selectedproductnames, quantity, routineisland,stationId } = req.body;
    //   const island_id = routineisland;
    //   const closing = 15;
    
    //   con.beginTransaction((err) => {
    //     if (err) {
    //       console.log('Transaction start failed:', err);
    //       return res.status(500).json({ message: 'Transaction start failed' });
    //     }
    
    //     // Check the current shift
    //     const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
    //     con.query(shiftSql, stationId,(err, shiftResults) => {
    //       if (err) {
    //         return res.json(err);
    //       }
    
    //       // Check if there are any shift records
    //       if (shiftResults.length === 0) {
    //         return res.json({ error: 'No shift records found' });
    //       }
    
    //       const lastShiftId = shiftResults[0].shift_id;
    
    //       // Function to insert or update a product based on its ID and quantity
    //       const insertOrUpdateProduct = (productId) => {
    //         if (!productId) {
    //           con.commit((err) => {
    //             if (err) {
    //               console.log('Transaction commit failed:', err);
    //               return con.rollback(() => {
    //                 res.status(500).json({ message: 'Registration failed' });
    //               });
    //             }
    //             console.log('Transaction committed.');
    //             return res.status(200).json({ message: 'Transaction committed' });
    //           });
    //           return;
    //         }
    
    //         const productQuantity = quantity[productId];
    //         const productExists = typeof productQuantity !== 'undefined';
    
    //         if (productExists) {
    //           const lastClosing = 0; // Change this if needed
    //           const productQuantityValue = parseInt(productQuantity, 10);
    //           const openingStock = lastClosing + productQuantityValue;
    //           let addedStock = 0;
    //           let totalStock = 0;
    
    //           // Fetch the last stock data
    //           const lastClosingQuery = `
    //             SELECT closing_stock AS last_closing, added_stock, Total_stock
    //             FROM non_fuel_routine_sales
    //             WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ? AND station_id=?
    //             ORDER BY sales_id DESC LIMIT 1`;
    
    //           con.query(lastClosingQuery, [productId, island_id, lastShiftId, stationId], (error, lastClosingResult) => {
    //             if (error) {
    //               console.error('Error querying last closing stock:', error);
    //               con.rollback(() => {
    //                 res.status(500).json({ message: 'Error querying last closing stock' });
    //               });
    //             } else {
    //               const lastClosing = lastClosingResult[0]?.last_closing || 0;
    //               addedStock = lastClosingResult[0].added_stock + productQuantityValue;
    //               totalStock = lastClosingResult[0].Total_stock + productQuantityValue;
    
    //               console.log('total stock is ', totalStock, ' added stock ', addedStock);
    //             }
    
    //             const updateQuery = `
    //               UPDATE non_fuel_routine_sales
    //               SET added_stock = ?, Total_stock = ?, closing_stock = ?
    //               WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ? AND station_id=?`;
    
    //             con.query(
    //               updateQuery,
    //               [addedStock, totalStock, closing, productId, island_id, lastShiftId, stationId],
    //               (error) => {
    //                 if (error) {
    //                   console.error('Error updating existing product:', error);
    //                   con.rollback(() => {
    //                     res.status(500).json({ message: 'Error updating existing product' });
    //                   });
    //                 } else {
    //                   insertOrUpdateProduct(selectedproductnames.shift());
    //                 }
    //               }
    //             );
    //           });
    //         } else {
    //           // Product doesn't exist in the current shift; insert a new row
    //           const lastClosing = 0; // Change this if needed
    //           const productQuantityValue = 0; // Adjust this if no quantity is available
    //           const openingStock = lastClosing + productQuantityValue;
    
    //           const insertQuery = `
    //             INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, Total_stock, closing_stock, shift_id, station_id)
    //             VALUES (?, ?, ?, ?, ?, ?, ?,?)`;
    
    //           con.query(
    //             insertQuery,
    //             [productId, island_id, lastClosing, productQuantityValue, openingStock, closing, lastShiftId, stationId],
    //             (error) => {
    //               if (error) {
    //                 console.error('Error inserting new row:', error);
    //                 con.rollback(() => {
    //                   res.status(500).json({ message: 'Error inserting new row' });
    //                 });
    //               } else {
    //                 insertOrUpdateProduct(selectedproductnames.shift());
    //               }
    //             }
    //           );
    //         }
    //       };
    
    //       // Start inserting or updating products
    //       insertOrUpdateProduct(selectedproductnames.shift());
    //     });
    //   });
    // });

    app.post('/islandtrans', (req, res) => {
      const { selectedproductnames, quantity, routineisland, stationId } = req.body;
      const island_id = routineisland;
      let closing = 0;
      console.log('selected prpduct ',selectedproductnames,' quantity ',quantity,' routine island ',routineisland)
    
      con.beginTransaction((err) => {
        if (err) {
          console.log('Transaction start failed:', err);
          return res.status(500).json({ message: 'Transaction start failed' });
        }
    
        // Check the current shift
        const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
        con.query(shiftSql, stationId, (err, shiftResults) => {
          if (err) {
            return res.json(err);
          }
         
          // Check if there are any shift records
          if (shiftResults.length === 0) {
            return res.json({ error: 'No shift records found' });
          }
    
          const lastShiftId = shiftResults[0].shift_id;
          console.log('your latest shift is ',lastShiftId)
    
          // Function to insert or update a product based on its ID and station ID
          const insertOrUpdateProduct = (productId) => {
            if (!productId) {
              con.commit((err) => {
                if (err) {
                  console.log('Transaction commit failed:', err);
                  return con.rollback(() => {
                    res.status(500).json({ message: 'Registration failed' });
                  });
                }
                console.log('Transaction committed.');
                return res.status(200).json({ message: 'Transaction committed' });
              });
              return;
            }
    
            const productQuantity = quantity[productId];
            console.log('quantity queried',productId);
            const productExists = typeof productQuantity !== 'undefined';
    
            // Check if the product exists for the specified station in this shift
            const productExistsQuery = `
              SELECT *
              FROM non_fuel_routine_sales
              WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ? AND station_id = ?
              ORDER BY sales_id DESC LIMIT 1`;
    
            con.query(productExistsQuery, [productId, island_id, lastShiftId, stationId], (error, productExistsResult) => {
              if (error) {
                console.error('Error querying product existence:', error);
                con.rollback(() => {
                  res.status(500).json({ message: 'Error querying product existence' });
                });
              } else {
                if (productExistsResult.length > 0) {
                  // Product exists for this station in this shift; handle the update logic
                  const lastClosing = 0; // Change this if needed
                  const productQuantityValue = parseInt(productQuantity, 10);
                
                  const openingStock = lastClosing + productQuantityValue;
               
    
                  const lastClosingResult = productExistsResult[0]; // Get the existing product data
                  console.log('inserted Qty, ',productQuantityValue,' and last closing ',lastClosingResult?.Total_stock)
                
                  const addedStock = lastClosingResult?.added_stock || 0;
                  const totalStock = (lastClosingResult?.Total_stock || 0)+productQuantityValue;
                  
                  console.log('total stock is ', totalStock, ' added stock ', addedStock);
    
                  const updateQuery = `
                    UPDATE non_fuel_routine_sales
                    SET added_stock = ?, Total_stock = ?, closing_stock = ?
                    WHERE product_name_id = ? AND sales_island_routine_id = ? AND shift_id = ? AND station_id = ?`;
    
                  con.query(
                    updateQuery,
                    [addedStock, totalStock, closing, productId, island_id, lastShiftId, stationId],
                    (error) => {
                      if (error) {
                        console.error('Error updating existing product:', error);
                        con.rollback(() => {
                          res.status(500).json({ message: 'Error updating existing product' });
                        });
                      } else {
                        insertOrUpdateProduct(selectedproductnames.shift());
                      }
                    }
                  );
                } else {
                  // Product doesn't exist for this station in this shift; insert a new row
               
                  const lastClosing = 0; // Change this if needed
                  const productQuantityValue = parseInt(productQuantity, 10);
                  const openingStock = lastClosing + productQuantityValue;
    
                  console.log('insert new product');
                  const insertQuery = `
                    INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock, Total_stock, closing_stock, shift_id, station_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
                  con.query(
                    insertQuery,
                    [productId, island_id, lastClosing, productQuantityValue, openingStock, closing, lastShiftId, stationId],
                    (error) => {
                      if (error) {
                        console.error('Error inserting new row:', error);
                        con.rollback(() => {
                          res.status(500).json({ message: 'Error inserting new row' });
                        });
                      } else {
                        insertOrUpdateProduct(selectedproductnames.shift());
                      }
                    }
                  );
                }
              }
            });
          };
    
          // Start inserting or updating products
          insertOrUpdateProduct(selectedproductnames.shift());
        });
      });
    });
    
    // end trial
    
    // end trial
app.post('/islandnonefuel', (req, res) => {
  const { selectedallocationpoints, selectedproductnames, quantity } = req.body;

  const island_id = selectedallocationpoints;
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
          let productQuantity = quantity[productId];
          productQuantity = parseInt(productQuantity, 10);
          const openingStock = lastClosing + productQuantity;

          const insertQuery =
            'INSERT INTO non_fuel_routine_sales (product_name_id, sales_island_routine_id, opening_stock, added_stock,`Total_stock`,  closing_stock) VALUES (?, ?, ?, ?,?, ?)';

          con.query(insertQuery, [product_id, island_id,lastClosing,productQuantity,openingStock, closing], (error) => {
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

//reconcillition trial

// combining island to nonefuel// attachment 


app.post('/islandproducts', (req, res) => {
  const { selectedallocationpoints,selectedproducttypes } = req.body;

  console.log('tapped');

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }

    const insertProductData = (productIndex) => {
      if (productIndex >= selectedproducttypes.length) {
        con.commit((err) => {
          if (err) {
            console.log('Transaction commit failed:', err);
            return con.rollback(() => {
              res.status(500).json({ message: 'Transaction commit failed' });
            });
          }
          console.log('Transaction committed.');
          return res.status(200).json({ message: 'island product type attachment successful' });
        });
        return;
      }

      const product_id = selectedproducttypes[productIndex];


          const insertQuery =
            'INSERT INTO `island_none_fuel`(`island_id`, `nonefuel_product_type_id`) VALUES (?, ?)';

          con.query(insertQuery, [selectedallocationpoints, product_id,], (error) => {
            if (error) {
              console.error('Transaction commit failed:', error);
              con.rollback(() => {
                res.status(500).json({ message: 'Transaction commit failed' });
              });
            } else {
              insertProductData(productIndex + 1); // Move to the next product
            }
          });
        
      
    };


    insertProductData(0); // Start inserting from the first product
  });

});

// end attachinmg island to nonefuel

 //nonefuel customer products

 app.post('/cashiertype', (req, res) => {
  const { selectedcashier,selectedproducttypes } = req.body;

 // const island_id = selectedproducttypes;
  //const closing = 15;

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    const insertProductData = (productIndex) => {
      if (productIndex >= selectedproducttypes.length) {
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

      const product_id = selectedproducttypes[productIndex];

          // const lastClosing = lastClosingResult[0]?.last_closing || 0;
          // let productQuantity = quantity[product_id];
          // productQuantity = parseInt(productQuantity, 10);
          // const openingStock = lastClosing + productQuantity;\

          //type routine cashier is island not cahsirrt

          const insertQuery =
            'INSERT INTO `routine_cashier_type`(`type_routine_cashier_id`, `product_type_id`) VALUES (?, ?)';

          con.query(insertQuery, [selectedcashier, product_id,], (error) => {
            if (error) {
              console.error('Error inserting new row:', error);
              con.rollback(() => {
                res.status(500).json({ message: 'Registration failed' });
              });
            } else {
              insertProductData(productIndex + 1); // Move to the next product
            }
          });
        
      
    };


    insertProductData(0); // Start inserting from the first product
  });

});

//reconcillition trial

app.post('/reconcile', (req, res) => {
  const { rowDataArray } = req.body;

  console.log('tapped');

  // Extract values from the rowDataArray
  const runnerValues = rowDataArray.map(row => row.name);
  const sum1Values = rowDataArray.map(row => row.ptype);
  const totalValues = rowDataArray.map(row => row.total);

  console.log(runnerValues);
  console.log(sum1Values);
  console.log(totalValues);

  // Simulating database insert (replace this with actual database operations)
  rowDataArray.forEach((row, index) => {
    const runner = runnerValues[index];
    const sum1 = sum1Values[index];
    const total = totalValues[index];

    // Here, perform your database insertion using runner, sum1, and total variables
    // For example:
    // YourDatabaseModel.create({ runner, sum1, total })
    // supervisor allocation
    const query =
      'INSERT INTO `trial`(`sales`, `profit`, `total`)VALUES (?,?,?)';

    con.query(query, [runner,sum1,total ], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('data attached successfully');
      }
    });
  });

  console.log('Data inserted into the database');

  // Sending response
  res.status(200).send('Data inserted into the database');
});

// end reconcilliation trial




  

// create shift routines
app.post('/createshift', (req, res) => {
  const { selectedallocationpoints, selectedsupervisors,selectedcashier,selectedPumpInfo, stationId} = req.body;

  
  console.log('pump island ',selectedPumpInfo)
  console.log('allocation point ',selectedallocationpoints)

  const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
  const currentTime = moment().format('HH:mm:ss');

  const processedIslands = new Set();
  const islandsWithPumps = new Set();

  const supervisor = Object.values(selectedsupervisors);
  const cashiers = Object.values(selectedcashier);
  const allocation = Object.values(selectedallocationpoints); // Rename it for clarity
  // const islandsWithPumpsData = selectedislandwithpumps;
  // const pumpIslands = Object.values(selectedpumpisland);


  let cashier_id;

  con.beginTransaction((err) => {
  if (err) {
    console.log('Transaction start failed:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }

  const shiftSql = 'SELECT * FROM `shift`  where station_id=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, stationId,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const shift_id = shiftResults[0].shift_id;

    console.log(shift_id);

    // proccess pump islandshere


  // pumps allocation
  cashiers.forEach((item) => {
    cashier_id = item;

  console.log(item)
    const query =
      'INSERT INTO `routine_cashier`( `routine_cashier_id`, `routine_shift_id`) VALUES (?,?)';

    con.query(query, [cashier_id, shift_id], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('pumps allocated successfully');
      }
    });
  }); 
  //end pumps allocation

  // island allocation
allocation.forEach((item) => {
  const island_id = item;

  console.log(item);
  const query =
    'INSERT INTO `routine_island`(`routine_island_id`, `routine_shift_id`) VALUES (?,?)';

  con.query(query, [island_id, shift_id], (error, results) => {
    if (error) {
      console.error('island attachment error:', error);
    } else {
      console.log('island allocated successfully');
    }
  });
});
  // //end island allocation




  // Loop through the selectedPumpInfo array
for (const pumpInfo of selectedPumpInfo) {
  const { pumpId, islandId } = pumpInfo;

  // Check if pumpId is not an empty string
  if (pumpId) {
    // Split the pumpId string into individual pump IDs
    const pumpIds = pumpId.split(',');

    // Loop through the individual pump IDs and insert pump routines
    for (const singlePumpId of pumpIds) {
      // Insert pump routine for the island with pumps into the pump_routine table
      const pumpQuery = 'INSERT INTO `pump_routine`(`routine_pump_id`, `shift_id`) VALUES (?, ?)';
      con.query(pumpQuery, [singlePumpId, shift_id], (error, pumpResults) => {
        if (error) {
          console.error('Error inserting pump data:', error);
        } else {
          console.log(`Pump routine inserted for island with ID ${islandId} and pump ID ${singlePumpId}`);
        }
      });
    }
  }
  // Check if the island has not been processed yet
  if (!processedIslands.has(islandId)) {
    // Insert island routine for the island into the island_routine table
    const islandQuery = 'INSERT INTO `routine_island`(`routine_island_id`, `routine_shift_id`) VALUES (?, ?)';
    con.query(islandQuery, [islandId, shift_id], (error, islandResults) => {
      if (error) {
        console.error('Error inserting island data:', error);
      } else {
        console.log(`Island routine inserted for island with ID ${islandId}`);
      }
    });

    // Add the island ID to the Set to mark it as processed
    processedIslands.add(islandId);
  }
}


// Iterate through islands with pumps and insert routines
// islandsWithPumpsData.forEach((islandData) => {
//   console.log(islandData);
//   const islandId = islandData.allocation_point_id;
//   const pumpId = islandData.pump_id;

//   console.log(`Processing island with ID: ${islandId} and pumpId ${pumpId}` );

  // if (pumpId) {
  //   // Insert pump routines for the island with pumps into the pump_routine table
  //   const pumpQuery = 'INSERT INTO `pump_routine`(`routine_pump_id`, `shift_id`) VALUES (?, ?)';
  //   con.query(pumpQuery, [pumpId, shift_id], (error, pumpResults) => {
  //     if (error) {
  //       console.error('Error inserting pump data:', error);
  //     } else {
  //       console.log(`Pump routine inserted for island with ID ${islandId} and pump ID ${pumpId}`);
  //     }
  //   });
  // }

  // // Check if the island has not been processed yet
  // if (!processedIslands.has(islandId)) {
  //   // Insert island routine for the island into the island_routine table
  //   const islandQuery = 'INSERT INTO `routine_island`(`routine_island_id`, `routine_shift_id`) VALUES (?, ?)';
  //   con.query(islandQuery, [islandId, shift_id], (error, islandResults) => {
  //     if (error) {
  //       console.error('Error inserting island data:', error);
  //     } else {
  //       console.log(`Island routine inserted for island with ID ${islandId}`);
  //     }
  //   });

  //   // Add the island ID to the Set to mark it as processed
  //   processedIslands.add(islandId);
  // }
// });

// pump routine


        con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Registration failed' });
              });
            }

            console.log('Shifty creation success');
            return res.status(200).json({ message: 'Shift successful' });
        });

  
  });
});
});
//. end create shift routine

// trial



 

// // create shift routines
// app.post('/newshift', (req, res) => {
//   const {selecteddatetime, selectedenddatetime} = req.body;

//   const currentDate= moment().format('YYYY-MM-DD HH:mm:ss');
//   const currentTime = moment().format('HH:mm:ss');
//  const enddatetime= selectedenddatetime;
//   //  const pumps = Object.values(selectedpumpisland);


//   con.beginTransaction((err) => {
//   if (err) {
//     console.log('Transaction start failed:', err);
//     return res.status(500).json({ message: 'Registration failed' });
//   }

//   console.log('tapped');
//   const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
//   con.query(shiftSql, (err, shiftResults) => {
//     if (err) {
//       return res.json(err);
//     }

//     console.log(shiftResults[0].shift_status)
//     // Check if there are any shift records
//     if (shiftResults[0].shift_status === 0 || shiftResults[0].shift_status === '0') {
//       console.log('instance running'); // Move this line before the return statement
//       return res.json({ err: 'An instance of Shift Still Running' });
//     }
    

//    const shiftSql = 'INSERT INTO `shift`(`shift_date`, `shift_time_fom`, `shift_time_to`) VALUES (?,?,?)';
//     con.query(shiftSql, [currentDate,currentTime,enddatetime], (loginErr, shiftResult) => {
//       if (loginErr) {
//         con.rollback(() => {
//           console.log('Failed to create shift:', loginErr);
//           return res.status(500).json({ message: 'shift not created' });
//         });
 
//       }

//         con.commit((commitErr) => {
//             if (commitErr) {
//               con.rollback(() => {
//                 console.log('Transaction commit failed:', commitErr);
//                 return res.status(500).json({ message: 'Shift creation failed' });
//               });
//             }

//             console.log('Shifty creation success');
//             return res.status(200).json({ message: 'shift created successfully' });
//         });

  
//       });

//     });
// });
// });
// //. end create shift routine

// test create new routine

app.post('/newshift', (req, res) => {
  const { selecteddatetime, selectedenddatetime, stationId } = req.body;
  console.log('station id  is ',stationId);

  const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
  const currentTime = moment().format('HH:mm:ss');
  const enddatetime = selectedenddatetime;

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Registration failed' });
    }

    console.log('tapped');
    const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
    con.query(shiftSql,stationId, (err, shiftResults) => {
      if (err) {
        return res.json(err);
      }

      if (shiftResults.length === 0 || shiftResults[0].shift_status === 1 || shiftResults[0].shift_status === '1') {
        // No existing shift records or no running shift instance found, create a new one
        const shiftSql = 'INSERT INTO `shift`(`shift_date`, `shift_time_fom`, `shift_time_to`, `station_id`) VALUES (?,?,?,?)';
        con.query(shiftSql, [currentDate, currentTime, enddatetime,stationId], (loginErr, shiftResult) => {
          if (loginErr) {
            con.rollback(() => {
              console.log('Failed to create shift:', loginErr);
              return res.status(500).json({ message: 'shift not created' });
            });
          }

          con.commit((commitErr) => {
            if (commitErr) {
              con.rollback(() => {
                console.log('Transaction commit failed:', commitErr);
                return res.status(500).json({ message: 'Shift creation failed' });
              });
            }

            console.log('Shift creation success');
            return res.status(200).json({ message: 'Shift created successfully' });
          });
        });
      } else {
        // There is an instance of Shift running
        console.log('An instance of Shift is still running');
        return res.json({ err: 'An instance of Shift is still running' });
      }
    });
  });
});


// end test create new routine

// trial



// app.post('/createshift', (req, res) => {
//   const { selectedallocationpoints, selectedsupervisors, selectedcashiers } = req.body;

//   const currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
//   const currentTime = moment().format('HH:mm:ss');

//   console.log(currentDate + ' ' + currentTime);

//   con.beginTransaction((beginTransactionErr) => {
//     if (beginTransactionErr) {
//       console.error('Error starting transaction:', beginTransactionErr);
//       return res.status(500).json({ message: 'Failed to create shift routine' });
//     }

//     const shiftSql = 'INSERT INTO `shift` (`shift_date`, `shift_time_fom`, `shift_time_to`) VALUES (?, ?, ?)';
//     con.query(shiftSql, [currentDate, currentTime, currentTime], (shiftQueryErr, shiftResult) => {
//       if (shiftQueryErr) {
//         console.error('Error inserting shift:', shiftQueryErr);
//         con.rollback(() => {
//           console.error('Rollback successful');
//         });
//         return res.status(500).json({ message: 'Failed to create shift routine' });
//       }

//       const shift_id = shiftResult.insertId;

//       insertSupervisors(con, shift_id, selectedsupervisors, (supervisorErr) => {
//         if (supervisorErr) {
//           console.error('Error inserting supervisors:', supervisorErr);
//           con.rollback(() => {
//             console.error('Rollback successful');
//           });
//           return res.status(500).json({ message: 'Failed to create shift routine' });
//         }

//         insertCashiers(con, shift_id, selectedcashiers, (cashierErr) => {
//           if (cashierErr) {
//             console.error('Error inserting cashiers:', cashierErr);
//             con.rollback(() => {
//               console.error('Rollback successful');
//             });
//             return res.status(500).json({ message: 'Failed to create shift routine' });
//           }

//           insertAllocationPoints(con, shift_id, selectedallocationpoints, (islandErr) => {
//             if (islandErr) {
//               console.error('Error inserting allocation points:', islandErr);
//               con.rollback(() => {
//                 console.error('Rollback successful');
//               });
//               return res.status(500).json({ message: 'Failed to create shift routine' });
//             }

//             con.commit((commitErr) => {
//               if (commitErr) {
//                 console.error('Error committing transaction:', commitErr);
//                 con.rollback(() => {
//                   console.error('Rollback successful');
//                 });
//                 return res.status(500).json({ message: 'Failed to create shift routine' });
//               }

//               res.json({ message: 'Shift routine created successfully' });
//             });
//           });
//         });
//       });
//     });
//   });
// });

// function insertSupervisors(con, shift_id, supervisors, callback) {
//   const insertQuery = 'INSERT INTO `routine_supervisor` (`routine_supervisor_id`, `routine_shift_id`) VALUES (?, ?)';

//   supervisors.forEach((supervisor_id) => {
//     con.query(insertQuery, [supervisor_id, shift_id], (error) => {
//       if (error) {
//         console.error('Error inserting supervisors:', error);
//         return callback(error);
//       }
//       console.log(`Supervisor ${supervisor_id} inserted successfully`);
//     });
//   });

//   callback(null);
// }

// function insertCashiers(con, shift_id, cashiers, callback) {
//   const insertQuery = 'INSERT INTO `routine_cashier` (`routine_cashier_id`, `routine_shift_id`) VALUES (?, ?)';

//   cashiers.forEach((cashier_id) => {
//     con.query(insertQuery, [cashier_id, shift_id], (error) => {
//       if (error) {
//         console.error('Error inserting cashiers:', error);
//         return callback(error);
//       }
//       console.log(`Cashier ${cashier_id} inserted successfully`);
//     });
//   });

//   callback(null);
// }

// function insertAllocationPoints(con, shift_id, allocationPoints, callback) {
//   const insertQuery = 'INSERT INTO `routine_island` (`routine_island_id`, `routine_shift_id`) VALUES (?, ?)';

//   allocationPoints.forEach((island_id) => {
//     con.query(insertQuery, [island_id, shift_id], (error) => {
//       if (error) {
//         console.error('Error inserting allocation points:', error);
//         return callback(error);
//       }
//       console.log(`Allocation point ${island_id} inserted successfully`);
//     });
//   });

//   callback(null);
// }



//trial

// banks
app.post('/createbank', (req,res)=>{
      const {bankname, account}=req.body;

  console.log(bankname, account)
    const query =
      'INSERT INTO `bank_accounts`( `account_bank_name`, `account_number`) VALUES (?,?)';

    con.query(query, [bankname, account], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('banks created successfully');
      }
    });
  });
//end banks

// // prices set
// app.post('/setprice', (req,res)=>{
//   const {selectedstock, price}=req.body;

// console.log(selectedstock, price)
// const query =
//   'INSERT INTO `product_price`(`product_price`, `price_product_id`) VALUES (?,?)';

// con.query(query, [selectedstock, price], (error, results) => {
//   if (error) {
//     console.error('Error inserting data:', error);
//   } else {
//     console.log('prices set created successfully');
//   }
// });
// });
// //end prices set



//trialselect prices

app.post('/setprice', (req, res) => {
  const {selectedstock, price}=req.body;

 //const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  const stockValues = Object.values(selectedstock);


  console.log(price)

 // console.log(typeof(selectedstock))

  stockValues.forEach((item) => {
      const stock_id = item;
      const fprice=price[stock_id];

  console.log(item)
    const query =
      ' INSERT INTO `product_price`(`product_price`, `price_product_id`) VALUES (?,?)';

    con.query(query, [fprice,stock_id], (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('Data inserted successfully');
      }
    });
  });
});



// end trial stock







//transactions below
//create nonefuel purchase
app.post('/nonefuelpayment', (req, res) => {
  const { selectedvendors, selectedcashiers, selectedpurchasetype,selecteditems,finaldate,selectedpaymentmode,selectedpaymentmethods,
          purchasetotalvalue,floatbalance,deliverynote, vehicle,invoiceno,pkgs,units,quantity, price,vat,amount, gross, doctotal,stationId} = req.body;
       
  const currentDate= moment().format('YYYY-MM-DD HH:mm:ss');

console.log(selectedvendors+'||'+selectedcashiers+'||'+selectedpurchasetype+'||'+selecteditems+'||'+finaldate+'||'+selectedpaymentmode+'||'+selectedpaymentmethods+'||'+
          purchasetotalvalue+'||'+floatbalance+'||'+deliverynote+'||'+vehicle+'||'+invoiceno+'||'+pkgs+'||'+units+'||'+quantity+'||'+price+'||'+vat+'||'+amount+'||'+ gross+'||'+doctotal);


  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }
// from here

  // select station to affect

  const stationSql='SELECT * FROM `supervisor` inner join supervisor_allocation on supervisor.supervisor_id= supervisor_allocation.allocation_supervisor_id inner join station on station.station_id=supervisor_allocation.allocation_station_id where supervisor_id=?';

  con.query(stationSql, [selectedcashiers], (stationErr, stationResult) => {
      if (stationErr) {
        con.rollback(() => {
          console.log('no selected station:', loginErr);
          return res.status(500).json({ message: 'invoice failed' });
        });
      }

     // stationId=stationResult[0].station_id;
    // console.log('station id is '+stationId)
  
  // end select station to affect

// to here
    const invoiceSql = 'INSERT INTO `purchase_invoice`( `invoice_no`, `invoice_date`, `invoice_amount`) VALUES (?,?,?)';
    con.query(invoiceSql, [invoiceno, finaldate, purchasetotalvalue], (loginErr, invoiceResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to intert purchase invoice:', loginErr);
          return res.status(500).json({ message: 'invoice failed' });
        });
      }
      
      const invoiceId = invoiceResult.insertId;

      let vehicleSql;
      let registerParams;

        vehicleSql = 'INSERT INTO `vehicle`(`vehicle_reg_no`, `vehicle_vendor_id`) VALUES (?,?)';
        registerParams = [vehicle,selectedvendors];
    

      con.query(vehicleSql, registerParams, (registerErr, vehicleResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to attach vehicle:', registerErr);
            return res.status(500).json({ message: 'vehicle attachment failed' });
          });
        }

      const vehicleId = vehicleResult.insertId;
      let purchasedetailsSql;
      let purchaseParams;
      const tax=15;

        purchasedetailsSql = 'INSERT INTO `purchase_details`(`purchase_date`, `purchase_invoice_id`, `payment_mode_id`, `payment_method_id`, `vendor_id`, `cashier_id`, `product_name_product_id`, `tax_id`, `purchase_veh_id`) VALUES (?,?,?,?,?,?,?,?,?)';
        purchaseParams = [finaldate,invoiceId,selectedpaymentmode,selectedpaymentmethods,selectedvendors,selectedcashiers,selectedpurchasetype,tax,vehicleId];
    

      con.query(purchasedetailsSql, purchaseParams, (registerErr, purchaseResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to insert purchase details:', registerErr);
            return res.status(500).json({ message: 'Failed to insert purchase details' });
          });
        }

      const purchaseId = purchaseResult.insertId;
      let purchasesSql;
      let purchasesParams;
     // const tax=15;

        purchasesSql = 'INSERT INTO `purchases`( `purchases_del_no`, `purchase_qty`, `purchase_price`, `purchase_total_amount`, `purchase_gross_amt`, `purchase_net_total`, `purchase_details_id`, `purchase_station_id`) VALUES (?,?,?,?,?,?,?,?)';
        purchasesParams = [deliverynote,quantity,price,amount,gross,doctotal,purchaseId, stationId];
    

      con.query(purchasesSql, purchasesParams, (registerErr, purchasesResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to insert purchase details:', registerErr);
            return res.status(500).json({ message: 'Failed to insert purchase details' });
          });
        }
     // commit all transactions

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Transaction failed' });
            });
          }

     
              // Select the current_shift_stock from the stock table
      // check the product remaining table

      // i need to insert stock fisrt
      const insertstock = 'INSERT INTO `stock`(`stock_product_id`, `stock_capacity`, `station_id`, `updated_date`) values(?,?,?,?)';

    con.query(insertstock, [selecteditems,quantity, stationId,currentDate], (StockErr, StockResult) => {
        if (StockErr) {
            console.error('Error inserting stock:', StockErr);
            return res.status(500).json({ message: 'Failed to select remaining stock' });
        }

      // Select the current remaining stock from the stock_remaining table
const selectRemainingStockQuery = 'SELECT `remaining_stock`, `remaining_id` FROM `stock_remaining` WHERE `stock_product_id` = ? AND `station_id` = ?';

con.query(selectRemainingStockQuery, [selecteditems, stationId], (selectRemainingStockErr, selectRemainingStockResult) => {
    if (selectRemainingStockErr) {
        console.error('Error selecting remaining stock:', selectRemainingStockErr);
        return res.status(500).json({ message: 'Failed to select remaining stock' });
    }

    if (selectRemainingStockResult.length > 0) {
        // A record exists, update the remaining stock and the date
        const remainingId = selectRemainingStockResult[0].remaining_id;
        const currentRemainingStock = selectRemainingStockResult[0].remaining_stock;
        const newRemainingStock = parseFloat(currentRemainingStock) + parseFloat(quantity);

        // Update the stock_remaining table with the new remaining stock and date
        const updateRemainingStockQuery = 'UPDATE `stock_remaining` SET `remaining_stock` = ?, `updated_date` = ? WHERE `remaining_id` = ?';

        const updateRemainingStockValues = [newRemainingStock, finaldate, remainingId];

        con.query(updateRemainingStockQuery, updateRemainingStockValues, (updateRemainingStockErr, updateRemainingStockResult) => {
            if (updateRemainingStockErr) {
                console.error('Error updating remaining stock:', updateRemainingStockErr);
                return res.status(500).json({ message: 'Failed to update remaining stock' });
            }

            console.log('Remaining stock updated successfully');
            return res.status(200).json({ message: 'Purchase details captured successfully' });
        });
    } else {
        // No record exists, create a new record
        const insertRemainingStockQuery = 'INSERT INTO `stock_remaining` (`remaining_stock`, `stock_product_id`, `station_id`, `updated_date`) VALUES (?, ?, ?, ?)';

        const insertRemainingStockValues = [quantity, selecteditems, stationId, finaldate];

        con.query(insertRemainingStockQuery, insertRemainingStockValues, (insertRemainingStockErr, insertRemainingStockResult) => {
            if (insertRemainingStockErr) {
                console.error('Error inserting remaining stock:', insertRemainingStockErr);
                return res.status(500).json({ message: 'Failed to insert remaining stock' });
            }

            console.log('New remaining stock record created successfully');
            return res.status(200).json({ message: 'Purchase details captured successfully' });
        });
    }
});

});

      //

          //end update stock
        });

      });

      });
     
      });
    });
      });
  });

});
//. end create nonefuel purchase


//createb fuel purchase
app.post('/fuelpayment', (req, res) => {
  const { selectedvendors, selectedcashiers, selectedpurchasetype,selecteditems,finaldate,selectedpaymentmode,selectedpaymentmethods,
         vatamount,deliverynote, vehicle,invoiceno,grn,totalamount,stockquantity, price,vat,amount, gross,quantity, stationId} = req.body;
          
console.log(finaldate+'||'+selectedcashiers+'||'+selectedvendors+'||'+selectedpurchasetype+'||'+selectedpaymentmethods+'||'+amount+'||'+selecteditems+'||'+vatamount+'||'+grn+'||'+stockquantity+'||'+totalamount+'||'+vat+'||'+deliverynote+'||'+vehicle+'||'+gross+'||'+selectedpaymentmode+'||'+invoiceno+'||'+vatamount+'||'+selectedpaymentmode+'||'+quantity);
 
  // if (!firstname || !lastname || !email || !username || !password || !rank||!phone||!idnumber) {
  //   return res.status(400).json({ message: 'Invalid registration data' });
  // }
  // console.log(firstname, lastname, email, phone,rank,national_id,location, username, password);

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }


  const stationSql='SELECT * FROM `supervisor` inner join supervisor_allocation on supervisor.supervisor_id= supervisor_allocation.allocation_supervisor_id inner join station on station.station_id=supervisor_allocation.allocation_station_id where supervisor_id=?';

  con.query(stationSql, [selectedcashiers], (stationErr, stationResult) => {
      if (stationErr) {
        con.rollback(() => {
          console.log('no selected station:', loginErr);
          return res.status(500).json({ message: 'invoice failed' });
        });
      }

     // stationId=stationResult[0].station_id;
     //console.log('station id is '+stationId)
  

    const invoiceSql = 'INSERT INTO `purchase_invoice`( `invoice_no`, `invoice_date`, `invoice_amount`) VALUES (?,?,?)';
    con.query(invoiceSql, [invoiceno, finaldate, totalamount], (loginErr, invoiceResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to intert purchase invoice:', loginErr);
          return res.status(500).json({ message: 'invoice failed' });
        });
      }
      
      const invoiceId = invoiceResult.insertId;

      let vehicleSql;
      let registerParams;

        vehicleSql = 'INSERT INTO `vehicle`(`vehicle_reg_no`, `vehicle_vendor_id`) VALUES (?,?)';
        registerParams = [vehicle,selectedvendors];
    

      con.query(vehicleSql, registerParams, (registerErr, vehicleResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to attach vehicle:', registerErr);
            return res.status(500).json({ message: 'vehicle attachment failed' });
          });
        }

      const vehicleId = vehicleResult.insertId;
      let purchasedetailsSql;
      let purchaseParams;
      const tax=15;

        purchasedetailsSql = 'INSERT INTO `purchase_details`(`purchase_date`, `purchase_invoice_id`, `payment_mode_id`, `payment_method_id`, `vendor_id`, `cashier_id`, `product_name_product_id`, `tax_id`, `purchase_veh_id`) VALUES (?,?,?,?,?,?,?,?,?)';
        purchaseParams = [finaldate,invoiceId,selectedpaymentmode,selectedpaymentmethods,selectedvendors,selectedcashiers,selectedpurchasetype,tax,vehicleId];
    

      con.query(purchasedetailsSql, purchaseParams, (registerErr, purchaseResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to insert purchase details:', registerErr);
            return res.status(500).json({ message: 'Failed to insert purchase details' });
          });
        }

      const purchaseId = purchaseResult.insertId;
      let purchasesSql;
      let purchasesParams;
     // const tax=15;

        purchasesSql = 'INSERT INTO `purchases`( `purchases_del_no`, `purchase_qty`, `purchase_price`, `purchase_total_amount`, `purchase_gross_amt`, `purchase_net_total`, `purchase_details_id`,`purchase_station_id`) VALUES (?,?,?,?,?,?,?,?)';
        purchasesParams = [deliverynote,quantity,price,amount,gross,amount,purchaseId,stationId];
    

      con.query(purchasesSql, purchasesParams, (registerErr, purchasesResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to insert purchase details:', registerErr);
            return res.status(500).json({ message: 'Failed to insert purchase details' });
          });
        }
     // commit all transactions

      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Transaction failed' });
            });
          }

          console.log('purchases data saved successful');
          // update the fuel proice
          const checkProductSql = 'SELECT current_capacity FROM fuel_capacity_control WHERE content_fuel_product_id = ? AND station_id = ?';
          con.query(checkProductSql, [selecteditems, stationId], (checkProductErr, checkProductResult) => {
            if (checkProductErr) {
              con.rollback(() => {
                console.log('Failed to check product in fuel capacity control:', checkProductErr);
                return res.status(500).json({ message: 'Failed to check product in fuel capacity control' });
              });
            }
            // If the product exists, update the current quantity
  if (checkProductResult.length > 0) {
    const previousCapacity = checkProductResult[0].current_capacity;
    const currentQuantity = parseFloat(previousCapacity) + parseFloat(quantity);

    console.log('updating ',previousCapacity,' + ',quantity,' = ',currentQuantity)
    // Update the control table with the new current quantity
    const updateCapacitySql = 'UPDATE fuel_capacity_control SET current_capacity = ? WHERE content_fuel_product_id = ? AND station_id = ?';
    con.query(updateCapacitySql, [currentQuantity,selecteditems, stationId], (updateCapacityErr) => {
      if (updateCapacityErr) {
        con.rollback(() => {
          console.log('Failed to update fuel capacity control:', updateCapacityErr);
          return res.status(500).json({ message: 'Failed to update fuel capacity control' });
        });
      }

      // Continue with the rest of your code or commit the transaction
    });
  } else {
    // If the product doesn't exist, insert it
    console.log('inserting',quantity)
    const insertCapacitySql = 'INSERT INTO fuel_capacity_control (content_fuel_product_id, current_capacity, station_id) VALUES (?, ?, ?)';
    con.query(insertCapacitySql, [selecteditems, quantity, stationId], (insertCapacityErr) => {
      if (insertCapacityErr) {
        con.rollback(() => {
          console.log('Failed to insert fuel capacity control:', insertCapacityErr);
          return res.status(500).json({ message: 'Failed to insert fuel capacity control' });
        });
      }

      // Continue with the rest of your code or commit the transaction
    });
  }
});

          //end update the fuel price


          return res.status(200).json({ message: 'Purchase details captured successfully' });
        });

      });

      });
});
     
      });
    });
  });

});
//. end create fuel purchase

//create vendor transactions
app.post('/vendorpayment', (req, res) => {
  const { selectedvendors, selectedcashiers,finaldate,selectedpaymentmode,selectedpaymentmethods,floatbalance,pvno,amount,selectedbanks, stationId} = req.body;
          
console.log(selectedvendors+'||'+selectedcashiers+'||'+finaldate+'||'+selectedpaymentmode+'||'+selectedpaymentmethods+'||'+floatbalance+'||'+selectedpaymentmode+'||'+selectedbanks+'||'+pvno+'||'+amount);
 
  // if (!firstname || !lastname || !email || !username || !password || !rank||!phone||!idnumber) {
  //   return res.status(400).json({ message: 'Invalid registration data' });
  // }
  //console.log(firstname, lastname, email, phone,rank,national_id,location, username, password);

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }

      // select station to affect

  const stationSql='SELECT * FROM `supervisor` inner join supervisor_allocation on supervisor.supervisor_id= supervisor_allocation.allocation_supervisor_id inner join station on station.station_id=supervisor_allocation.allocation_station_id where supervisor_id=?';

  con.query(stationSql, [selectedcashiers], (stationErr, stationResult) => {
      if (stationErr) {
        con.rollback(() => {
          console.log('no selected station:', loginErr);
          return res.status(500).json({ message: 'invoice failed' });
        });
      }

     // stationId=stationResult[0].station_id;
  //   console.log('station id is '+stationId)
  
  // end select station to affect

// to here

    const invoiceSql = 'INSERT INTO `transaction`(`transaction_type`, `transaction_payment_method_id`, `transaction_amount`, `transaction_date`, `transaction_vendor_id`, `transaction_cashier_id`,`transaction_station_id`) VALUES (?,?,?,?,?,?,?)';
    con.query(invoiceSql, [selectedpaymentmode, selectedpaymentmethods, amount,finaldate,selectedvendors,selectedcashiers, stationId], (loginErr, transResult) => {
      if (loginErr) {
        con.rollback(() => {
          console.log('Failed to attach transaction:', loginErr);
          return res.status(500).json({ message: 'transaction failed' });
        });
      }
      const transactionId = transResult.insertId;

      console.log(selectedpaymentmode);

      if(selectedpaymentmode===1 || selectedpaymentmode==='1')
      {
  
      let vendorSql;
      let registerParams;

        vendorSql = 'INSERT INTO `vendor_payment`(`vendor_payment_vendor_acc_id`, `vendor_transaction_id`) VALUES (?,?)';
        registerParams = [selectedvendors,transactionId];
    

      con.query(vendorSql, registerParams, (registerErr, vendorResult) => {
        if (registerErr) {
          con.rollback(() => {
            console.log('Failed to attach vehicle:', registerErr);
            return res.status(500).json({ message: 'vehicle attachment failed' });
          });
        }

      // const vehicleId = vehicleResult.insertId;
      // let purchasedetailsSql;
      // let purchaseParams;
      // const tax=15;

       
      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Transaction failed' });
            });
          }

          console.log('purchases data saved successful');
          return res.status(200).json({ message: 'Purchase details captured successfully' });
        });

     
      });
      //here

    }
    else{
          
      con.commit((commitErr) => {
          if (commitErr) {
            con.rollback(() => {
              console.log('Transaction commit failed:', commitErr);
              return res.status(500).json({ message: 'Transaction failed' });
            });
          }

          console.log('transaction successful');
          return res.status(200).json({ message: 'transaction successful' });
        });

    }
    //else end here
    });
  });
  });
});
//. end create vendor payment
//end transaction

// reconcilliatiion

//SELECT * FROM `non_fuel_routine_sales` inner join routine_island on non_fuel_routine_sales.sales_island_routine_id=routine_island.routine_id inner join product_name on non_fuel_routine_sales.product_name_id=product_name.product_item_id inner join product_classes on product_name.product_item_class_id=product_classes.product_class_id inner join product_type on product_type.product_type_id=product_classes.product_type_id inner join allocation_point on allocation_point.allocation_point_id=routine_island.routine_island_id inner join shift on shift.shift_id=routine_island.routine_shift_id order by non_fuel_routine_sales.product_name_id DESC LIMIT 1

//end reconcilliation


//handle deletes
//transacation... vendor delete

// Define a DELETE endpoint to delete a payment by transaction_id
// Define the Express route for deleting a transaction
app.delete('/venderpaymentdelete/:transactionId', (req, res) => {
  const transactionId = req.params.transactionId;

  // Define the DELETE SQL query
  const deleteQuery = 'DELETE FROM transaction WHERE transaction_id = ?'; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [transactionId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/invoicepaymentdelete/:delId', (req, res) => {
  const delId = req.params.delId;

  console.log('delete id ',delId)
  // Define the DELETE SQL query
 const deleteQuery = `DELETE invoice_sales_details
 FROM invoice_sales_details
 INNER JOIN sales ON sales.sales_id = invoice_sales_details.actual_sales_id
 INNER JOIN cashier ON cashier.cashier_id = sales.routine_cashier
 INNER JOIN product_name ON product_name.product_item_id = sales.sales_product_id
 INNER JOIN customers ON customers.customer_id = invoice_sales_details.customer_id
 WHERE invoice_sales_details_id=?`; // Replace 'your_table_name' with your actual table name

  // // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});


app.delete('/creditpaymentdelete/:delId', (req, res) => {
  const delId = req.params.delId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM credit_sale_details
  USING credit_sale_details
  INNER JOIN sales ON sales.sales_id = credit_sale_details.actual_sales_id
  INNER JOIN cashier ON cashier.cashier_id = sales.routine_cashier
  INNER JOIN product_name ON product_name.product_item_id = sales.sales_product_id
  WHERE details_id = ?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/fuelpaymentdelete/:transactionId', (req, res) => {
  const delId = req.params.transactionId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `Delete FROM purchases USING purchases inner join purchase_details on purchase_details.purchase_id = purchases.purchase_details_id inner join purchase_invoice on purchase_invoice.invoice_id = purchase_details.purchase_invoice_id inner join vehicle on vehicle.vehicle_id = purchase_details.purchase_veh_id inner join cashier on cashier.cashier_id = purchase_details.cashier_id inner join product_name on product_name.product_item_id = purchase_details.product_name_product_id inner join vendor on vendor.vendor_id = purchase_details.vendor_id where purchases.purchases_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/nonefuelpaymentdelete/:transactionId', (req, res) => {
  const delId = req.params.transactionId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `Delete FROM purchases USING purchases inner join purchase_details on purchase_details.purchase_id = purchases.purchase_details_id inner join purchase_invoice on purchase_invoice.invoice_id = purchase_details.purchase_invoice_id inner join vehicle on vehicle.vehicle_id = purchase_details.purchase_veh_id inner join cashier on cashier.cashier_id = purchase_details.cashier_id inner join product_name on product_name.product_item_id = purchase_details.product_name_product_id inner join vendor on vendor.vendor_id = purchase_details.vendor_id where purchases.purchases_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

// delete tankpump
app.delete('/tankpumpdelete/:tankpumpId', (req, res) => {
  const tankpumpId = req.params.tankpumpId;

  //console.log('del id is ',tankpumpId);

  // Define the DELETE SQL query
  console.log('dele id is ',tankpumpId)
  const deleteQuery = `DELETE FROM tank_pump WHERE tank_pump_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [tankpumpId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete tankpump

// delete islandproduct
app.delete('/islandproductdelete/:islandproductId', (req, res) => {
  const islandproductId = req.params.islandproductId;

  //console.log('del id is ',islandproductId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM island_none_fuel WHERE island_nonefuel_id = ?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [islandproductId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete islandproduct

// delete pumpisland
app.delete('/pumpislanddelete/:pumpislandId', (req, res) => {
  const pumpislandId = req.params.pumpislandId;

  //console.log('del id is ',pumpislandId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM pump_island WHERE pump_island_id = ?`;// Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [pumpislandId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete pumpisland

// forecourt pump   
//  view pump reading
app.get('/forecourtpump', (req, res) => {

  // Select final shift to get its ID
  const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, (err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

   //SELECT * FROM `pump_meter_reading` inner join pump on pump.pump_id=pump_meter_reading.pump_id inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id inner join tank_pump on tank_pump.pump_id=pump.pump_id inner join tank on tank.tank_id=tank_pump.tank_id inner join tank_content on tank_content.tank_id=tank.tank_id inner join product_name on product_name.product_item_id=tank_content.tank_content_product_id where pump_meter_reading.reading_shift_id=131


  const routineSql = 'SELECT * FROM `pump_meter_reading` inner join pump on pump.pump_id=pump_meter_reading.pump_id inner join shift on shift.shift_id=pump_meter_reading.reading_shift_id where pump_meter_reading.reading_shift_id=?';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
      if (err) {
        return res.json(err);
      }
      
      // Return the results from routine_cashier
      return res.json(routineResults);
    });
  });
});
//  view pump reading
app.get('/viewvendor', (req, res) => {
  const sql = 'SELECT * FROM  vendor inner join vendor_account on vendor.vendor_id=vendor_account.vendor_acc_vendor_id';
  con.query(sql, (err, results) => {
    if (err) {
      return res.json(err);
    }
    return res.json(results);
  });
});
//. end view  vendor


//fetchcurrent reconcilliation cashier report
app.get('/shiftcashierreport', (req, res) => {
  // Select final shift to get its ID
  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;
console.log(lastShiftId)
   // return res.json('last shift id '+lastShiftId);

const sql = `SELECT * FROM reconcilliation inner join routine_cashier_island on routine_cashier_island.routine_allocation_id=reconcilliation.island_id inner join routine_cashier on routine_cashier.routine_id=routine_cashier_island.routine_cashier_id inner join cashier on cashier.cashier_id=routine_cashier.routine_cashier_id inner join allocation_point on allocation_point.allocation_point_id=reconcilliation.island_id inner join shift on shift.shift_id=reconcilliation.shift_id where reconcilliation.shift_id=? AND routine_cashier.routine_shift_id=?`;

con.query(sql, [lastShiftId, lastShiftId], (err, routineResults) => {
  if (err) {
    return res.json(err);
  }
  
  // Return the results from routine_cashier
  return res.json(routineResults);
});
});
});
//. end take current reconcilliation cashier report

//fetchcurrent reconcilliation
app.get('/shiftreconcillaition', (req, res) => {
  // Select final shift to get its ID

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;
console.log(lastShiftId)
   // return res.json('last shift id '+lastShiftId);

const sql = `SELECT * FROM reconcilliation inner join allocation_point on allocation_point.allocation_point_id=reconcilliation.island_id where shift_id=?`;

con.query(sql, [lastShiftId], (err, routineResults) => {
  if (err) {
    return res.json(err);
  }
  
  // Return the results from routine_cashier
  return res.json(routineResults);
});
});
});
//. end take current reconcilliation

//  view nonefuel sales
app.get('/shiftnonefuel', (req, res) => {

  station_id=req.query.stationId;

  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, station_id,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

   // return res.json('last shift id '+lastShiftId);

  const routineSql = 'SELECT * FROM `partial_sales` inner join product_name on product_name.product_item_id=partial_sales.sales_item_id inner join shift on shift.shift_id=partial_sales.partial_sales_shift_id inner join allocation_point on allocation_point.allocation_point_id=partial_sales.partial_island_id where partial_sales_shift_id=?';
  con.query(routineSql, [lastShiftId], (err, routineResults) => {
    if (err) {
      return res.json(err);
    }
    
    // Return the results from routine_cashier
    return res.json(routineResults);
  });
});
});
//. end view nonefuel 

// update components

/// end point update 
app.post('/updatestock', (req, res) => {
  const { selectedProductId, selectedProductPrice, stationId,selectedcapacity } = req.body;

  const currentTime = moment().format('YYYY-MM-DD');

  console.log('product ',selectedProductId,' price ', selectedProductPrice,' station ',stationId,' capacity', selectedcapacity)

  const checkQuery = `
    SELECT *
    FROM product_price
    INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id
    INNER JOIN stock ON stock.stock_product_id = product_name.product_item_id
    WHERE product_name.product_item_id = ?`;

  con.query(checkQuery, [selectedProductId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('Error checking product:', checkErr);
      return res.status(500).send('Error checking product');
    }

    if (checkResult.length === 0) {
      // Product not found in joined tables, perform an insert
      console.log('Product not found in joined tables, performing insert...',`${selectedProductId}`);

      // Perform your insert logic here
        // Perform your insert logic here
      const insertStockQuery = 'INSERT INTO `stock`(`stock_product_id`, `stock_capacity`, `station_id`, `updated_date`) VALUES (?, ?, ?, ?)';
     
      const insertProductPriceQuery = 'INSERT INTO `product_price`(`product_price`, `price_product_id`) VALUES (?, ?)';

      // Check if the relationship exists in stock table
  const checkStockQuery = 'SELECT * FROM `stock` INNER JOIN product_name ON product_name.product_item_id = stock.stock_product_id WHERE product_name.product_item_id = ?';

  con.query(checkStockQuery, [selectedProductId], (stockCheckErr, stockCheckResult) => {
    if (stockCheckErr) {
      console.error('Error checking stock:', stockCheckErr);
      return res.status(500).send('Error checking stock');
    }

    if (stockCheckResult.length > 0) {
      // Relationship exists, perform an update
      const updateStockQuery = 'UPDATE `stock` SET `stock_capacity`=?, `station_id`=?, `updated_date`=? WHERE `stock_id`=?';
      con.query(updateStockQuery, [selectedcapacity, stationId, currentTime, stockCheckResult[0].stock_id], (updateStockErr, updateStockResult) => {
        if (updateStockErr) {
          console.error('Error updating stock:', updateStockErr);
          return res.status(500).send('Error updating stock');
        }
        console.log('Stock updated successfully');
        // Continue with the rest of the logic
      });
    } else {
      // Relationship doesn't exist, perform the insert
      con.query(insertStockQuery, [selectedProductId, selectedcapacity, stationId, currentTime], (stockErr, stockResult) => {
        if (stockErr) {
          return con.rollback(() => {
            console.error('Error inserting into stock:', stockErr);
            res.status(500).send('Error inserting into stock');
          });
        }
        // Continue with the rest of the logic
      });
    }
  });

  // Check if the relationship exists in product_price table
  const checkProductPriceQuery = 'SELECT * FROM `product_price` INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id WHERE product_name.product_item_id = ?';

  con.query(checkProductPriceQuery, [selectedProductId], (priceCheckErr, priceCheckResult) => {
    if (priceCheckErr) {
      console.error('Error checking product_price:', priceCheckErr);
      return res.status(500).send('Error checking product_price');
    }

    if (priceCheckResult.length > 0) {
      // Relationship exists, perform an update
      const updateProductPriceQuery = 'UPDATE `product_price` SET `product_price`=? WHERE `price_product_id`=?';
      con.query(updateProductPriceQuery, [selectedProductPrice, priceCheckResult[0].price_id], (updatePriceErr, updatePriceResult) => {
        if (updatePriceErr) {
          console.error('Error updating product_price:', updatePriceErr);
          return res.status(500).send('Error updating product_price');
        }
        console.log('Product_price updated successfully');
        // Continue with the response or additional logic
        res.status(200).send('Insert transaction committed successfully');
      });
    } else {
      // Relationship doesn't exist, perform the insert
      con.query(insertProductPriceQuery, [selectedProductPrice, selectedProductId], (priceErr, priceResult) => {
        if (priceErr) {
          return con.rollback(() => {
            console.error('Error inserting into product_price:', priceErr);
            res.status(500).send('Error inserting into product_price');
          });
        }
        // Continue with the response or additional logic
        res.status(200).send('Insert transaction committed successfully');
      });
    }

    
  });
          
      // ...

    } else {
      // Product found in joined tables, perform an update
      console.log('Product found in joined tables, performing update...',`${selectedProductId}`);

        // Perform your update logic here
  const updateQuery = `
  UPDATE product_price
  INNER JOIN product_name ON product_name.product_item_id = product_price.price_product_id
  INNER JOIN stock ON stock.stock_product_id = product_name.product_item_id
  SET product_price.product_price=?, stock.stock_capacity=?, stock.station_id=?
  WHERE product_name.product_item_id=?`;

con.query(updateQuery, [parseFloat(selectedProductPrice), parseFloat(selectedcapacity), stationId, selectedProductId], (updateErr, updateResult) => {
  if (updateErr) {
    console.error('Error updating product:', updateErr);
    return res.status(500).send('Error updating product');
  }

  console.log('Product updated successfully');
  res.status(200).send('Product updated successfully');
});
    
    }
  });
});

// update fuel


app.post('/updatefuel', (req, res) => {
  const { selectedpumpId,selectedcash,selectedmanual,selectedelectric,stationId } = req.body;

  const currentTime = moment().format('YYYY-MM-DD');
  console.log('pump id ',selectedpumpId);

  // Select final shift to get its ID
  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, stationId,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

        // Perform your update logic here
  const updateQuery = `
  UPDATE pump_meter_reading SET cash_meter =?,electric_meter=?,manual_meter=? WHERE reading_shift_id=? AND pump_id=?`;

con.query(updateQuery, [selectedcash, selectedelectric, selectedmanual,lastShiftId, selectedpumpId], (updateErr, updateResult) => {
  if (updateErr) {
    console.error('Error updating product:', updateErr);
    return res.status(500).send('Error updating product');
  }

  console.log('Product updated successfully');
  res.status(200).send('Product updated successfully');
});
    
}); 
  });


// update


// update reconcilliation report


// update fuel


app.post('/updaterecon', (req, res) => {
  const { selectedProductId,selecteddrop,selectedInvoice,selectedtotalsales,selectedcredit,stationId} = req.body;

  const currentTime = moment().format('YYYY-MM-DD');

  const onstation= parseFloat(selectedtotalsales)-(parseFloat(selectedInvoice) - parseFloat(selectedcredit))

  const variance = parseFloat(selecteddrop)-onstation;

  console.log('total sales ',selectedtotalsales,' credit sales ',selectedcredit,' invoice sales ',selectedInvoice,' variance ', variance)

  // Select final shift to get its ID
  const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';
  con.query(shiftSql, stationId,(err, shiftResults) => {
    if (err) {
      return res.json(err);
    }

    // Check if there are any shift records
    if (shiftResults.length === 0) {
      return res.json({ error: 'No shift records found' });
    }

    // Get the ID of the last shift
    const lastShiftId = shiftResults[0].shift_id;

        // Perform your update logic here
  const updateQuery = `
  UPDATE reconcilliation SET dropped=?,expected=?,variance=? WHERE reconcilliation_id=? AND shift_id=?`;

con.query(updateQuery, [selecteddrop,onstation, variance, selectedProductId, lastShiftId], (updateErr, updateResult) => {
  if (updateErr) {
    console.error('Error updating product:', updateErr);
    return res.status(500).send('Error updating product');
  }

  console.log('Product updated successfully');
  res.status(200).send('Product updated successfully');
});
    
}); 
  });

//end update

// delete components

///end point delete        
// Define a DELETE endpoint to delete a payment by transaction_id
// Define the Express route for deleting a transaction
app.delete('/venderpaymentdelete/:transactionId', (req, res) => {
  const transactionId = req.params.transactionId;

  // Define the DELETE SQL query
  const deleteQuery = 'DELETE FROM transaction WHERE transaction_id = ?'; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [transactionId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/invoicepaymentdelete/:delId', (req, res) => {
  const delId = req.params.delId;

  console.log('delete id ',delId)
  // Define the DELETE SQL query
 const deleteQuery = `DELETE invoice_sales_details
 FROM invoice_sales_details
 INNER JOIN sales ON sales.sales_id = invoice_sales_details.actual_sales_id
 INNER JOIN cashier ON cashier.cashier_id = sales.routine_cashier
 INNER JOIN product_name ON product_name.product_item_id = sales.sales_product_id
 INNER JOIN customers ON customers.customer_id = invoice_sales_details.customer_id
 WHERE invoice_sales_details_id=?`; // Replace 'your_table_name' with your actual table name

  // // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});


app.delete('/creditpaymentdelete/:delId', (req, res) => {
  const delId = req.params.delId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM credit_sale_details
  USING credit_sale_details
  INNER JOIN sales ON sales.sales_id = credit_sale_details.actual_sales_id
  INNER JOIN cashier ON cashier.cashier_id = sales.routine_cashier
  INNER JOIN product_name ON product_name.product_item_id = sales.sales_product_id
  WHERE details_id = ?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/fuelpaymentdelete/:transactionId', (req, res) => {
  const delId = req.params.transactionId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `Delete FROM purchases USING purchases inner join purchase_details on purchase_details.purchase_id = purchases.purchase_details_id inner join purchase_invoice on purchase_invoice.invoice_id = purchase_details.purchase_invoice_id inner join vehicle on vehicle.vehicle_id = purchase_details.purchase_veh_id inner join cashier on cashier.cashier_id = purchase_details.cashier_id inner join product_name on product_name.product_item_id = purchase_details.product_name_product_id inner join vendor on vendor.vendor_id = purchase_details.vendor_id where purchases.purchases_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

app.delete('/nonefuelpaymentdelete/:transactionId', (req, res) => {
  const delId = req.params.transactionId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `Delete FROM purchases USING purchases inner join purchase_details on purchase_details.purchase_id = purchases.purchase_details_id inner join purchase_invoice on purchase_invoice.invoice_id = purchase_details.purchase_invoice_id inner join vehicle on vehicle.vehicle_id = purchase_details.purchase_veh_id inner join cashier on cashier.cashier_id = purchase_details.cashier_id inner join product_name on product_name.product_item_id = purchase_details.product_name_product_id inner join vendor on vendor.vendor_id = purchase_details.vendor_id where purchases.purchases_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});

// delete tankpump
app.delete('/tankpumpdelete/:tankpumpId', (req, res) => {
  const tankpumpId = req.params.tankpumpId;

  //console.log('del id is ',tankpumpId);

  // Define the DELETE SQL query
  console.log('dele id is ',tankpumpId)
  const deleteQuery = `DELETE FROM tank_pump WHERE tank_pump_id=?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [tankpumpId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete tankpump

// delete islandproduct
app.delete('/islandproductdelete/:islandproductId', (req, res) => {
  const islandproductId = req.params.islandproductId;

  //console.log('del id is ',islandproductId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM island_none_fuel WHERE island_nonefuel_id = ?`; // Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [islandproductId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete islandproduct

// delete pumpisland
app.delete('/pumpislanddelete/:pumpislandId', (req, res) => {
  const pumpislandId = req.params.pumpislandId;

  //console.log('del id is ',pumpislandId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM pump_island WHERE pump_island_id = ?`;// Replace 'your_table_name' with your actual table name

  // Execute the DELETE query
  con.query(deleteQuery, [pumpislandId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
// end delete pumpisland


// reconcilliation delete
app.delete('/recondelete/:reconciliationId', (req, res) => {
  const delId = req.params.reconciliationId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM reconcilliation WHERE reconcilliation_id=?`;

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});


//reconcilliation delete

// reconcilliation delete
app.delete('/productdelete/:productId', (req, res) => {
  const delId = req.params.productId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM product_name WHERE product_item_id=?`;

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});


//reconcilliation delete

//pump meter reading delete
app.delete('/pumpdelete/:pumpId', (req, res) => {
  const delId = req.params.pumpId;

 // console.log('del id is ',delId);


   // Select final shift to get its ID
   const shiftSql = 'SELECT * FROM `shift` ORDER BY shift_id DESC LIMIT 1';
   con.query(shiftSql,(err, shiftResults) => {
     if (err) {
       return res.json(err);
     }
 
     // Check if there are any shift records
     if (shiftResults.length === 0) {
       return res.json({ error: 'No shift records found' });
     }
 
     // Get the ID of the last shift
     const lastShiftId = shiftResults[0].shift_id;

     console.log('pump id ',delId, 'shift_id is ',lastShiftId)

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM pump_meter_reading WHERE pump_meter_reading.reading_shift_id=? AND pump_meter_reading.pump_id=?`;

  // Execute the DELETE query
  con.query(deleteQuery, [lastShiftId,delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});
});


//pump meter reading delete


//partialsales delete
app.delete('/lubsdelete/:partialId', (req, res) => {
  const delId = req.params.partialId;

 // console.log('del id is ',delId);

  // Define the DELETE SQL query
  const deleteQuery = `DELETE FROM partial_sales WHERE partial_sales.partial_sales_id=?`;

  // Execute the DELETE query
  con.query(deleteQuery, [delId], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Failed to delete record' });
    } else {
      console.log('Record deleted successfully');
      res.status(200).json({ message: 'Record deleted successfully' });
    }
  });
});


//partialsales delete

//check the theb fule sale

app.post('/fuelsale', (req, res) => {
  const formattedData = req.body;
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  let station = formattedData[0].stationId;
  let dipInputData = formattedData[0].dipinputData;

  const pumpIds = Array.from(new Set(formattedData.map(data => data.pump_id)));

  con.beginTransaction((err) => {
    if (err) {
      console.log('Transaction start failed:', err);
      return res.status(500).json({ message: 'Transaction failed' });
    }

    const shiftSql = 'SELECT * FROM `shift` where `station_id`=? ORDER BY shift_id DESC LIMIT 1';

    con.query(shiftSql, station, (err, shiftResults) => {
      if (err) {
        con.rollback(() => {
          return res.json(err);
        });
      }

      if (shiftResults.length === 0) {
        con.rollback(() => {
          return res.json({ error: 'No shift records found' });
        });
      }

      const lastShiftId = shiftResults[0].shift_id;

      // Retrieve previous pump meter readings
    //   const queryPrevious = `
    //   SELECT pump_id, cash_meter, electric_meter, manual_meter
    //   FROM pump_meter_reading
    //   WHERE (pump_id, reading_id) IN (
    //     SELECT pump_id, MAX(reading_id) as max_reading_id
    //     FROM pump_meter_reading
    //     WHERE pump_id IN (?)
    //     GROUP BY pump_id
    //   )
    //   ORDER BY pump_id;
    // `;

    const queryPrevious = `
    SELECT pmr.pump_id,pn.product_item_id, pmr.cash_meter, pmr.electric_meter, pmr.manual_meter
    FROM pump_meter_reading pmr
    JOIN (
      SELECT pump_id, MAX(reading_id) as max_reading_id
      FROM pump_meter_reading
      WHERE pump_id IN (?)
      GROUP BY pump_id
    ) maxReading ON pmr.pump_id = maxReading.pump_id AND pmr.reading_id = maxReading.max_reading_id
    JOIN pump p ON pmr.pump_id = p.pump_id
    JOIN tank_pump tp ON p.pump_id = tp.pump_id
    JOIN tank t ON tp.tank_id = t.tank_id
    JOIN tank_content tc ON t.tank_id = tc.tank_id
    JOIN product_name pn ON tc.tank_content_product_id = pn.product_item_id
    WHERE pmr.pump_id IN (?)
    ORDER BY pmr.pump_id
    
  `;


      con.query(queryPrevious, [pumpIds, pumpIds], (err, results) => {
        if (err) {
          con.rollback(() => {
            console.error('Error retrieving previous data:', err);
            return res.status(500).json({ message: 'Transaction failed' });
          });
        }

        if (!Array.isArray(results) || results.length === 0) {
          con.rollback(() => {
            console.error('No previous data found');
            return res.status(500).json({ message: 'Transaction failed' });
          });
        }
        
      
        console.log('data found', results);

        const previousDataMap = new Map();
        results.forEach(row => {
          previousDataMap.set(row.pump_id, {
            cash_meter: row.cash_meter,
            electric_meter: row.electric_meter,
            manual_meter: row.manual_meter,
            product_id: row.product_item_id
          });
        });

        console.log('Previous data map:', previousDataMap);


        const salesData = [];
        const groupedPumps = new Map();

        formattedData.forEach(currentData => {
          const previousData = previousDataMap.get(currentData.pump_id);

          if (previousData) {
            // Calculate meter differences
            const manualMeterDifference = parseFloat(currentData.manualmeter) - parseFloat(previousData.manual_meter);
            const electricMeterDifference = parseFloat(currentData.electricmeter) - parseFloat(previousData.electric_meter);
            const cashMeterDifference = parseFloat(currentData.cashmeter) - parseFloat(previousData.cash_meter);

            console.log(`Pump ID: ${currentData.pump_id}, Electric Meter Difference: ${electricMeterDifference}`);

            const pumpSales = {
              pump_id: currentData.pump_id,
              allocation_point_id: previousData.product_id, // Assuming product_id is stored in tank_content_product_id
              manual_meter_difference: manualMeterDifference,
              electric_meter_difference: electricMeterDifference,
              cash_meter_difference: cashMeterDifference
            };

            salesData.push(pumpSales);

          }
        });

        salesData.forEach(sale => {
          if (!groupedPumps.has(sale.allocation_point_id)) {
            groupedPumps.set(sale.allocation_point_id, {
              electric_meter_difference: 0,  // Resetting to 0 for each group
              pumps: []
            });
          }
        
          const group = groupedPumps.get(sale.allocation_point_id);
        
          group.electric_meter_difference += sale.electric_meter_difference;
        
          group.pumps.push({
            pump_id: sale.pump_id,
            electric_meter_difference: sale.electric_meter_difference
          });
        });

        console.log('Grouped Pumps:', groupedPumps);

        // Retrieve product capacities
        const queryCapacity = `
          SELECT pump.pump_id, tank_content.tank_id, tank_content.tank_content_product_id, fuel_capacity_control.current_capacity

          FROM pump
          INNER JOIN tank_pump ON tank_pump.pump_id = pump.pump_id
          INNER JOIN tank ON tank.tank_id = tank_pump.tank_id
          INNER JOIN tank_content ON tank_content.tank_id = tank.tank_id
          INNER JOIN product_name ON product_name.product_item_id = tank_content.tank_content_product_id
          INNER JOIN fuel_capacity_control ON fuel_capacity_control.content_fuel_product_id = product_name.product_item_id
          WHERE pump.pump_id IN (?)
          GROUP BY pump.pump_id,tank_content.tank_content_product_id, fuel_capacity_control.current_capacity;
        `;

        con.query(queryCapacity, [pumpIds], (capacityErr, capacityResults) => {
          if (capacityErr) {
            con.rollback(() => {
              console.error('Error retrieving product capacity:', capacityErr);
              return res.status(500).json({ message: 'Transaction failed' });
            });
          }

          console.log('fuel capacity control works',capacityResults )

          const productCapacityMap = new Map();

          //  capacityResults.forEach(row => {
          //  productCapacityMap.set(row.product_item_id, {
          //     current_capacity: row.current_capacity,
          //     total_electric_meter: row.total_electric_meter
          //   });
          // });

          capacityResults.forEach(row => {
            const key = parseFloat(`${row.tank_content_product_id}`);
            const group = productCapacityMap.get(key) || { current_capacity: 0, total_electric_meter: 0 };
          
            group.current_capacity = row.current_capacity;

           // Use total_electric_meter from groupedPumps if available, otherwise default to 0
            group.total_electric_meter = groupedPumps.has(row.tank_content_product_id)
            ? groupedPumps.get(row.tank_content_product_id).electric_meter_difference
            : 0;
            productCapacityMap.set(key, group);

           // console.log(' grouped capacity ',  group.current_capacity,' grouped electric ',group.total_electric_meter)

          });

          console.log('salesdata map ',salesData );

          // Continue with the capacity check
          const productIdsWithExceededCapacity = [];
          salesData.forEach(sales => {
            const productId = sales.allocation_point_id;
            const capacityInfo = productCapacityMap.get(productId);
            console.log('currentCapacity ', productCapacityMap)
            if (capacityInfo) {
              const currentCapacity = capacityInfo.current_capacity;
              const totalElectricMeter = capacityInfo.total_electric_meter;

             // console.log('currentCapacity ',currentCapacity,' totalElectricMeter ',totalElectricMeter);

              if (currentCapacity !== undefined && totalElectricMeter > currentCapacity) {
                productIdsWithExceededCapacity.push(productId);
                console.log('amounts in the tank too low')
              }
            }
          });

          if (productIdsWithExceededCapacity.length > 0) {
            // Capacity exceeded, rollback the transaction
            console.log('exceeded');
            con.rollback(() => {
              return res.status(400).json({
                message: 'Total electric meter difference exceeds current capacity for the following products:',
                exceededProducts: productIdsWithExceededCapacity
              });
            });
          }

          console.log('continue with the code');

          // Continue with the rest of the code if capacity check passes
          // ...

          const insertSalesQuery = `
          INSERT INTO shift_pump_sales( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id, station_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        salesData.forEach(sales => {
          const values = [
            sales.cash_meter_difference,
            sales.electric_meter_difference,
            sales.manual_meter_difference,
            sales.pump_id,
            sales.allocation_point_id,
            formattedData[0].shift_id,
            formattedData[0].stationId,
          ];

          average = (sales.manual_meter_difference + sales.electric_meter_difference) / 2;
          avgpumpId = sales.pump_id;
          con.query(insertSalesQuery, values, (salesErr, salesResult) => {
            if (salesErr) {
              console.error('Error inserting todays actual fuel sales:', salesErr);
            } else {
              console.log('shift pump Sales data inserted successfully');
            }
          });
        });
      
    });



    const query = `
    INSERT INTO pump_meter_reading( cash_meter, electric_meter, manual_meter, pump_id, island, reading_shift_id, station_id)
    VALUES(?,?,?,?,?,?,?)
  `;

  formattedData.forEach((data) => {
    const values = [
      data.cashmeter,
      data.electricmeter,
      data.manualmeter,
      data.pump_id,
      data.allocation_point_id,
      data.shift_id,
      data.station_id,
    ];

    con.query(query, values, (err, result) => {
      if (err) {
        console.error('Error inserting data into the database:', err);
      } else {
        console.log('pump meter reading inserted successfully');
      }
    });
  });


  dipInputData.forEach((dipData) => {
    if (Object.keys(dipData).length > 0) {
      let tankId;

      for (const key in dipData) {
        if (typeof dipData[key] === 'object' && dipData[key].tankid) {
          tankId = dipData[key].tankid;
          tankdip = dipData[key].tankname
          break; // Exit the loop once a tank ID is found
        }
      }
  
      
      console.log('tank id is ',tankId,' current dip ',tankdip)
  
      try {
        const tankDataQuery = `
        SELECT total, dips
        FROM dip
        WHERE dip_tank_id = ?
          AND dip_station_id = ?
        ORDER BY dip_id DESC
        LIMIT 1;
        
        `;

        con.query(tankDataQuery, [tankId, station], (tankErr, results) => {
          if (tankErr) {
            console.error('Error querying tank data:', tankErr);
            return;
          }
       
         // const opening=results[0].length === 0 ? 0 : results[0].total;
        
         let opening;

          let content;
          let dipTotal;

          const addition=0;
          // select the content

          const contentQuery = `
          SELECT * from tank inner join tank_content on tank_content.tank_id=tank.tank_id inner join product_name on product_name.product_item_id=tank_content.tank_content_product_id inner join fuel_capacity_control on fuel_capacity_control.content_fuel_product_id=product_name.product_item_id where tank.tank_id=?
          `;
  
          con.query(contentQuery, [tankId], (tankErr, contentresults) => {
            if (tankErr) {
              console.error('Error querying tank data:', tankErr);
              return;
            }
        
           // const opening=results[0].length === 0 ? 0 : results[0].total;
            content = contentresults && contentresults.length > 0 ? contentresults[0].product_item_id : 0;

            opening = contentresults && contentresults.length > 0 ? contentresults[0].current_capacity : 0;
          
 
             dipTotal=opening+addition;
           
            console.log('content found ',content)
          });
          // end select contend
        
          console.log('opening total dip ',opening,' content id ',content,' tank id is ',tankId)


            // Fetching totals from all pumps associated with the tank
          const pumpTotalsQuery = `
          SELECT SUM(s.electric_meter) AS total
          FROM shift_pump_sales s
          JOIN pump p ON s.pump_id = p.pump_id
          JOIN tank_pump tp ON p.pump_id = tp.pump_id
          WHERE tp.tank_id = ? AND reading_shift_id=?
            AND s.pump_id IN (${Array(pumpIds.length).fill('?').join(', ')});
        `;
  
        con.query(pumpTotalsQuery, [tankId, lastShiftId, ...pumpIds], (pumpErr, pumpTotalsRows) => {
          if (pumpErr) {
            console.error('Error querying pump totals:', pumpErr);
            return;
          }

          //console.log('shift sales data ',pumpTotalsRows)
          const pumpTotals = pumpTotalsRows[0]?.total || 0;
          const dipSales=pumpTotalsRows[0]?.total || 0;
          const dipClosing=dipTotal -parseFloat(dipSales)
          const dipVariance=parseFloat(dipClosing)- parseFloat(tankdip)


          const dipInsertQuery = `
          INSERT INTO dip(opening, additional, total, sales, closing, dips,variance, dip_tank_content_id, dip_shift_id, dip_tank_id, dip_station_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)
          `;

          const dipValues = [
            opening,
            pumpTotals,
            dipTotal,
            dipSales,
            dipClosing,
            parseFloat(tankdip),
            dipVariance,
            content,
            lastShiftId,
            tankId,
            formattedData[0].stationId,
          ];

          console.log('dip values ', dipValues);
  
          con.query(dipInsertQuery, dipValues, (dipErr, dipResult) => {
            if (dipErr) {
              console.error('Error inserting dip data:', dipErr);
            } else {
              console.log('Dip data inserted successfully');
              //return res.status(200).json({ message: 'transaction successful' });
            }
          });
          });
        });
      } catch (error) {
        console.error('Error:', error);
      }
    } else {
      console.log('No keys found in dipData');
      return res.status(500).json({ message: 'transaction unsuccessful' });
    }
  });


       
  con.commit((commitErr) => {
    if (commitErr) {
      con.rollback(() => {
        console.log('Transaction commit failed:', commitErr);
        return res.status(500).json({ message: 'Transaction failed' });
      });
    }

    console.log('sales made successfully');
    return res.status(200).json({ message: 'sales made successfully' });
  });



          // Assuming the rest of your code is here, including the dip data processing and transaction commit

          // con.commit(...);
        });
      });
    });
  });



//end checking

//end delete components

app.get ('/',(req,res) =>{
      return res.json('this is backend my people')
})



app.listen (8082, (req,res) =>{
      console.log('listening from port 8082')
})


