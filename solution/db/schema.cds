namespace products;

entity ProductExtension {
  key Product     : String(40);
      ProductType : String(4);
      Description : String(500);
      BaseUnit    : String(3);
      Embedding   : Vector(768);
}
