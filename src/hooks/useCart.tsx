import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = window.localStorage.getItem("@RocketShoes:cart");
    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  function updateCart(newCart: Product[]) {
    setCart(newCart);
    window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const itemInCart = updatedCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get(`/stock/${productId}`);
      const stockQuantity = stock.data.amount;
      const currentAmount = itemInCart ? itemInCart.amount : 0;
      const newAmount = currentAmount + 1;

      if (newAmount > stockQuantity) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (itemInCart) {
        itemInCart.amount = newAmount;
      } else {
        const response = await api.get(`/products/${productId}`);
        const newItem: Product = { ...response.data, amount: 1 };
        updatedCart.push(newItem);
      }

      updateCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  console.log(cart);

  const removeProduct = (productId: number) => {
    try {
      const itemInCart = cart.find((product) => product.id === productId);

      if (!itemInCart) {
        throw Error();
      }

      const newCart = cart.filter((product) => product.id !== productId);
      updateCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);
      const stockQuantity = stock.data.amount;

      if (amount > stockQuantity) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) => {
        return product.id === productId ? { ...product, amount } : product;
      });

      setCart(newCart);
      window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  return context;
}
