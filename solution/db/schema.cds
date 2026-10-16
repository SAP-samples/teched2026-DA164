namespace products;

entity ProductExtension {
  key Product     : String(40);
      ProductType : String(4);
      Description : String(500);
      BaseUnit    : String(3);
      AISummary   : String(1000);
      Embedding   : Vector(1536);
}
