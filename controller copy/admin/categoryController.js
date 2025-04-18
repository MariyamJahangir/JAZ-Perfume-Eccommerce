
const categoryModel = require('../../model/categoryModel')
const productModel = require('../../model/productModel')
const offerModel = require('../../model/offerModel')
const moment = require('moment');

// Get Categories
const category = async (req, res) => {
    try {
       
        const categories = await categoryModel.find({ deleted: false });
        
        const formattedCategories = categories.map((category) => ({
            _id: category._id, 
            name: category.name,
            image: category.image,
            description: category.description,
            createdAt: moment(category.createdAt).format('DD MMM YYYY'), 
        }));
        
        res.render('admin/category', { categories: formattedCategories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Internal Server Error');
    }
}

// Get Add Category Page
const loadAddCategory = async (req, res) => {
    const offer = await offerModel.find({offerType: 'category', isActive: true, expiry: { $gte: new Date() }}).lean()
    res.render('admin/add-category', {offer})
}

// Post Add Category
const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const image = req.file;
        
        if (!name || !description || !image) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        
        const existingCategory = await categoryModel.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists.' });
        }

        const category = new categoryModel({
            name,
            description,
            image: image.filename,
        });
        await category.save();
        res.status(200).json({ message: 'Category added successfully!' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
}

// Get Edit Category Page
const loadEditCategory = async (req, res) => {
    try {
        const category = await categoryModel.findById(req.params.id).lean();
        const offers = await offerModel.find({offerType: 'category', expiry: { $gte: new Date() }, isActive: true,  }).lean();
        
        category.imageUrl = `/uploads/${category.image}`; 
        
        res.render('admin/edit-category', { category, offers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Post Update Edit category
const editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, offer } = req.body;
        
        
        if (!name || !description) {
            return res.json({ message: 'Name and description are required.' });
        }
        const updatedData = { name, description, offer };
        
        if (req.file) {
            updatedData.image = req.file.filename; 
        }
        const category = await categoryModel.findById(id);


        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        

        
        await categoryModel.findByIdAndUpdate(id, updatedData, { new: true });
        res.status(200).json({ message: 'Category updated successfully!' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Could not update the category ${error.message}` });
    }
};


// Post Soft Delete Category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        await categoryModel.findByIdAndUpdate(id, { deleted: true });
        res.status(200).json({ success: true, message: 'Category deleted successfully!' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Error deleting category' });
    }
};



module.exports = {
    category,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    editCategory,
    deleteCategory
}