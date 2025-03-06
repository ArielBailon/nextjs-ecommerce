import ProductList from "@/components/shared/product/product-list";
import sampleData from "@/db/sample-data";
const Homepage = () => {
  return (
    <>
      <ProductList data={sampleData.products} title="Newest Arrival" limit={4}/>
    </>
  );
};

export default Homepage;
