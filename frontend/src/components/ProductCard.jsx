export default function ProductCard({ product, onBuyClick }) {
  const mrp = Number(product?.mrp ?? 0);
  const offerPrice = Number(product?.offerPrice ?? product?.price ?? mrp);
  const discountPercentage = Number(product?.offerPercentage ?? 0);
  const showDiscount = discountPercentage > 0;

  const handleBuyClick = () => {
    if (onBuyClick) {
      onBuyClick(product);
    }
  };

  return (
    <div className="w-fit max-w-[300px] overflow-hidden rounded-xl border border-slate-600/60 bg-gray-800 p-3 shadow-md">
      <div className="h-32 w-full overflow-hidden rounded-md bg-gray-700/60">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-32 w-full object-cover rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-300">No image</div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="truncate text-sm font-semibold text-white">{product.name}</h3>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-gray-400 line-through">Rs {mrp.toFixed(2)}</span>
          <span className="font-bold text-green-400">Rs {offerPrice.toFixed(2)}</span>
          {showDiscount && (
            <span className="rounded bg-red-500 px-2 py-0.5 text-xs text-white">{discountPercentage}% OFF</span>
          )}
        </div>

        {product.category && product.unitType && (
          <p className="mt-1 text-xs text-gray-300">
            {product.category} | {product.unitType}
          </p>
        )}
      </div>

      <button
        onClick={handleBuyClick}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
      >
        Buy Now
      </button>

      {product.redirectUrl && (
        <a
          href={product.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs text-cyan-300 underline hover:text-cyan-200"
        >
          View Details
        </a>
      )}
    </div>
  );
}
