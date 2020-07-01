import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IOrdersRepository from '../repositories/IOrdersRepository';
import Order from '../infra/typeorm/entities/Order';

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductData {
  product_id: string;
  quantity: number;
  price: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomerRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomerExists = await this.customersRepository.findById(
      customer_id,
    );

    if (!checkCustomerExists) {
      throw new AppError('Customer not found');
    }

    const productsId = products.map(product => ({ id: product.id }));

    const productsData = await this.productsRepository.findAllById(productsId);

    const productsDUpdatedQuantity: IProduct[] = [];
    const productsAddPrice: IProductData[] = [];

    products.forEach(product => {
      const data = productsData.find(
        productData => productData.id === product.id,
      );

      if (!data) {
        throw new AppError('produc not found');
      }

      if (product.quantity > data.quantity) {
        throw new AppError('Quantity not disponible');
      }

      productsDUpdatedQuantity.push({
        quantity: data.quantity - product.quantity,
        id: product.id,
      });

      productsAddPrice.push({
        product_id: product.id,
        quantity: product.quantity,
        price: data.price,
      });
    });

    await this.productsRepository.updateQuantity(productsDUpdatedQuantity);

    const order = await this.ordersRepository.create({
      customer: checkCustomerExists,
      products: productsAddPrice,
    });

    return order;
  }
}

export default CreateProductService;
