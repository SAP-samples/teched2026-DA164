# Exercise 1 – Clean Core & Side-by-Side Extensibility

In this exercise you will connect your app to the SAP S/4HANA Cloud Product API using a **BTP Destination**. You will read live service charge data from S/4HANA — without changing anything inside S/4HANA itself.

> **What does "clean core" mean?**
> The S/4HANA system stays exactly as it is. All your custom logic and AI features live in a separate app on SAP BTP. The two systems talk through a standard API. This is called a **side-by-side extension**.

> **Story context:**
> GlobalFreight AG has a strict clean core policy — no custom code modifications inside S/4HANA. Maya's service charge catalog is locked in there, but you can't touch the system. In this exercise you will use a BTP Destination to read service charge data through a standard API. S/4HANA never knows you added anything. This is the first step: get access to the data without breaking the rules.

---

## What you will do

1. Import the S/4HANA API model into your project
2. Verify the pre-configured BTP Destination for S/4HANA
3. Tell CAP to use that destination when calling the Product API
4. Write code that fetches real product data
5. Test that it works

---

## Step 1 – Import the S/4HANA API Model

CAP needs a local copy of the S/4HANA Product API definition to know the shape of the data. The `API_PRODUCT_SRV.edmx` file is included in this repository — you will download it, upload it to your BAS workspace, and import it into your project.

1. Download [`API_PRODUCT_SRV.edmx`](../../resources/API_PRODUCT_SRV.edmx) from the `resources/` folder in this repository.

   > On GitHub: click the link above → click **Download raw file** (the download icon in the top-right of the file view).

2. In BAS, open the **Explorer** side panel, right-click your workspace home folder (the root, above your project), and choose **Upload Files**. Select the `.edmx` file you just downloaded.

![Right-click the project folder and choose Upload to import the EDMX file](images/upload.png)

3. In the terminal, import it into your project:

```bash
cds import ~/API_PRODUCT_SRV.edmx --as cds
```

This generates two files automatically:
- `srv/external/API_PRODUCT_SRV.cds` — the CDS model CAP uses to call S/4HANA
- `srv/external/API_PRODUCT_SRV.json` — the metadata used at runtime

It also adds a base entry for `API_PRODUCT_SRV` to your `package.json`.

![Terminal showing cds import output confirming files were created in srv/external](images/cdsimport.png)

![BAS Explorer showing the generated API_PRODUCT_SRV.cds and API_PRODUCT_SRV.edmx files in srv/external](images/extfiles.png)

> The API Hub key is provided in Step 3 below and in [`resources/workshop-info.md`](../../resources/workshop-info.md).

---

## Step 2 – Verify the S/4HANA Destination

The `S4HANA_SANDBOX` destination has been pre-configured for you. You do not need to create it — but it is worth understanding what it contains, because your CAP app will use it in the next step.

Here is what was set up:

| Field | Value |
|---|---|
| Name | `S4HANA_SANDBOX` |
| Type | HTTP |
| URL | `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_PRODUCT_SRV` |
| Authentication | NoAuthentication |
| `URL.headers.APIKey` | An API key for the SAP Business Accelerator Hub sandbox |
| `sap-client` | `100` |

> **Why a destination?**
> Instead of hardcoding the S/4HANA URL and API key into your app, you register them once as a named BTP Destination. Your CAP app then refers to this name — `S4HANA_SANDBOX` — and BTP handles the connection details at runtime. If the URL or credentials ever change, only the destination needs updating.

![BTP Cockpit showing S4HANA_SANDBOX destination with HTTP type and the sandbox URL](images/destcheck.png)

![Check Connection dialog confirming the S4HANA_SANDBOX connection succeeded](images/s4dest.png)

---

## Step 3 – Configure CAP to Use the Destination

1. Back in BAS, open [package.json](../../package.json).

2. The `cds init` command created a `"cds"` section. Add the following inside `"requires"` (create the `"requires"` object if it isn't there yet):

```json
"cds": {
  "requires": {
    "API_PRODUCT_SRV": {
      "kind": "odata",
      "model": "srv/external/API_PRODUCT_SRV",
      "[production]": {
        "credentials": {
          "destination": "S4HANA_SANDBOX",
          "path": ""
        }
      },
      "[development]": {
        "credentials": {
          "url": "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_PRODUCT_SRV",
          "headers": { "APIKey": "<YOUR_API_HUB_KEY>" }
        }
      }
    }
  }
}
```

Replace `<YOUR_API_HUB_KEY>` with the key below:

```
UnBbpWyxaAAfmu4QAku2qSicZce4IWA6
```

3. Save the file.

![package.json open in BAS showing the API_PRODUCT_SRV configuration block with the API key filled in](images/packagejson.png)

---

## Step 4 – Create the Service Definition

1. Create a new file `srv/product-service.cds` and add:

```cds
using { API_PRODUCT_SRV } from './external/API_PRODUCT_SRV';

service ProductService {
  type ProductResult {
    Product      : String;
    ProductType  : String;
    BaseUnit     : String;
    CreationDate : Date;
  }

  action getProducts(top: Integer default 20)
    returns array of ProductResult;
}
```

2. Save the file.

![product-service.cds open in BAS showing the ProductResult type definition and getProducts action](images/prodservice.cds.png)

> You are defining a CAP service with one action. In Exercise 2 you will expand this file with more entities and actions as the app grows.

---

## Step 5 – Create the Service Handler

1. Create a new file `srv/product-service.js` and add:

```js
import cds from '@sap/cds'

export default class ProductService extends cds.ApplicationService {

  async init() {
    const s4 = await cds.connect.to('API_PRODUCT_SRV')

    this.on('getProducts', async (req) => {
      const { top = 20 } = req.data

      const products = await s4.run(
        SELECT.from('API_PRODUCT_SRV.A_Product')
          .columns('Product', 'ProductType', 'BaseUnit', 'CreationDate')
          .limit(top)
      )

      return products
    })

    return super.init()
  }
}
```

2. Save the file.

![product-service.js open in BAS showing the ES module syntax with import and export default](images/prodservicejs.png)

---

## Step 6 – Test It

1. In the terminal, restart the app:

```bash
cds watch
```

2. Open a second terminal tab. Go to **Terminal → New Terminal** in the menu bar:

![Open a new terminal via Terminal menu > New Terminal](images/newterminal.png)

Then run:

```bash
curl -X POST http://localhost:4004/odata/v4/product/getProducts \
  -H "Content-Type: application/json" \
  -d '{"top": 5}'
```

3. You should see real product records coming back from S/4HANA:

```json
[
  { "Product": "21",  "ProductType": "SERV", "CreationDate": "2016-10-17", "BaseUnit": "H"  },
  { "Product": "68",  "ProductType": "MAT",  "CreationDate": "2017-03-27", "BaseUnit": "KG" },
  { "Product": "71",  "ProductType": "ROH",  "CreationDate": "2017-04-11", "BaseUnit": "KG" },
  { "Product": "221", "ProductType": "SERV", "CreationDate": "2022-01-27", "BaseUnit": "AU" },
  { "Product": "231", "ProductType": "SERV", "CreationDate": "2022-01-30", "BaseUnit": "AU" }
]
```

![Terminal showing the curl response with live product records from S/4HANA](images/curl.png)

> **Notice**: This is live S/4HANA data. And you never touched the S/4HANA system — that is clean core.

---

## Summary

You now have:
- A BTP Destination connecting your app to the S/4HANA Cloud Product API
- A working CAP handler that reads live product data
- Zero modifications to S/4HANA

**Next**: Store this product data in SAP HANA Cloud and add your own extension fields.

Continue to [Exercise 2 – Extend & Persist in SAP HANA Cloud](../ex2/README.md)
