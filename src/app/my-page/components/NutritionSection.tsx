import { Calendar, Target, Award, Dumbbell } from 'lucide-react';

export default function WorkoutsSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Nutrition</h2>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg">
            Add Workout
          </button>
        </div>
      </div>

      {/* NutritionMeal Grid - Full height */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">Current Week</h3>
            <Calendar className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl font-bold mt-3">3 workouts</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">This Month</h3>
            <Target className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl font-bold mt-3">12 workouts</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">Completion Rate</h3>
            <Award className="w-5 h-5 opacity-90" />
          </div>
          <p className="text-3xl font-bold mt-3">85%</p>
        </div>
      </div>

      {/* Recent Workouts List - Takes remaining space */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Workouts</h3>
        <div className="space-y-4 h-full overflow-y-auto">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Morning Swim Session #{item}</h4>
                  <p className="text-sm text-gray-500">1500m • 45min • Completed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Mon, Dec {10 + item}</p>
                <p className="text-xs text-gray-500">{item} days ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

