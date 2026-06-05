#
# Instituto Federal de Educação, Ciência e Tecnologia - IFPE
# Campus: Igarassu
# Course: Internet Systems
# Subject: Scientific Methodology
# Professor: Allan Lima - allan.lima@igarassu.ifpe.edu.br
#
# Public Domain Code: Feel free to use, modify, and redistribute it.
#

# Instructions for running the code:
# 1) If the interpreter does not recognize the enum class, install it using:
#    sudo pip install enum34
# 2) Ensure the code runs on Python 3:
#    python3 randomWalkModel.py

import enum
import random
from PIL import Image

# for image generation:
#" pip install Pillow "

# Enum class to represent the possible states of an individual in the simulation.
class State(enum.Enum):
    healthy = 0  # Healthy state
    sick = 1     # Sick state
    dead = 2     # Dead state
    immune = 3   # Immune state

# Class representing each individual in the population.
class Individual:
    def __init__(self, state):
        self.state = state      # Current state of the individual

# Main class implementing the Random Walk Model simulation.
class RandomWalkModel:
    """
    Initializes the simulation's population grid and parameters.
        
    Args:
        populationMatrixSize (int): The size of the square population matrix.
    """
    def __init__(self, populationMatrixSize):
        self.population = []           # Current state of the population grid
        self.nextPopulation = []       # Next state of the population grid after interactions
        self.currentGeneration = 0     # Current generation count
 
        # Defines transition probabilities for state changes.
        self.transitionProbabilities = [[1.0, 0.0, 0.0, 0.0],  # Healthy transitions
                                        [0.1, 0.2, 0.3, 0.4],  # Sick transitions
                                        [0.0, 0.0, 1.0, 0.0],    # Dead transitions
                                        [0.1, 0.0, 0.0, 0.9]]  # Immune transitions
        
        self.contagionFactor = 0.5  # Probability of getting sick after interaction with a sick individual
        self.socialDistanceEffect = 0.0 # Probability of avoiding contact because of social distancing

        # Initializes the population matrix with healthy individuals.
        for i in range(populationMatrixSize):
            self.population.append([])
            self.nextPopulation.append([])
            for j in range(populationMatrixSize):
                self.population[i].append(Individual(State.healthy))
                self.nextPopulation[i].append(Individual(State.healthy))

        # Sets the initial sick individual at the center of the matrix.
        startIndex = int(populationMatrixSize / 2)
        self.population[startIndex][startIndex].state = State.sick
        self.nextPopulation[startIndex][startIndex].state = State.sick
        #print("first case", startIndex, startIndex)

    def update_parameters(self, contagion_factor, social_distance):
        """Updates simulation parameters dynamically."""
        self.contagionFactor = contagion_factor
        self.socialDistanceEffect = social_distance

    def apply_vaccination(self, percentage):
        """
        Vaccinates a percentage of the healthy population.
        Args:
            percentage (float): 0.0 to 1.0 representing fraction of healthy people to vaccinate.
        """
        for i in range(len(self.population)):
            for j in range(len(self.population[i])):
                if self.population[i][j].state == State.healthy:
                    if random.random() < percentage:
                        self.population[i][j].state = State.immune
                        # Ensure nextPopulation is also updated to avoid sync issues
                        self.nextPopulation[i][j].state = State.immune

    """
    Determines the next state of an individual based on transition probabilities 
    and processes interactions if the individual is sick.
    
    Args:
        line (int): The row index of the individual.
        column (int): The column index of the individual.
    """
    def individualTransition(self, line, column):
        individual = self.population[line][column]

        if (individual.state == State.dead):  # Skips transitions for dead individuals
            return
        
        if (individual.state == State.healthy):  # Skips transitions for healthy individuals
            return
        
        if (individual.state == State.sick):  # Only sick individuals with spread the virus
            self.computeSocialInteractions(line, column)

        # TODO: Determines the next state using probabilities for the current state
        probabilities = self.transitionProbabilities[individual.state.value]
        number = random.random()
        cumulativeProbability = 0

        for index in range(len(probabilities)):
            cumulativeProbability += probabilities[index]
            if number <= cumulativeProbability:
                self.nextPopulation[line][column].state = State(index)
                break

    """
    Simulates the possibility of a healthy individual becoming sick 
    after interacting with a sick individual.
    
    Args:
        individual (Individual): The healthy individual being evaluated.
        neighbour (Individual): The sick neighbor.
    """
    def computeSickContact(self, neighbour):
        number = random.random()
        if (number <= self.contagionFactor):
            neighbour.state = State.sick  # an individual becomes sick

    """
    Evaluates interactions between a sick individual and its neighbors, 
    considering the possibility of contagion.
    
    Args:
        line (int): The row index of the sick individual.
        column (int): The column index of the sick individual.
    """
    def computeSocialInteractions(self, line, column):
        individual = self.population[line][column]
        initialLine = max(0, line - 1)
        finalLine = min(line + 2, len(self.population))

        #print(line, column)

        for i in range(initialLine, finalLine):
            initialColumn = max(0, column - 1)
            finalColumn = min(column + 2, len(self.population[i]))

            for j in range(initialColumn, finalColumn):
                if (i == line and j == column): # Skips the individual itself
                    continue

                avoidContact = self.socialDistanceEffect >= random.random()

                if (not avoidContact):
                    neighbour = self.nextPopulation[i][j]
                    if (neighbour.state == State.healthy):
                        #print("->", i, j)
                        self.computeSickContact(neighbour)
                        #print("->", i, j, neighbour.state)

    """
    Advances the simulation by transitioning all individuals 
    to their next state based on current conditions.
    """
    def nextGeneration(self):
        for i in range(len(self.population)):
            for j in range(len(self.population[i])):
                self.individualTransition(i, j)

        # The next population becomes the current one 
        for i in range(len(self.population)):
            for j in range(len(self.population[i])):
                self.population[i][j].state = self.nextPopulation[i][j].state
  
    """Generates a report of the current state counts in the population."""
    def report(self):
        states = list(State)
        cases = [0] * len(states)

        for row in self.population:
            for individual in row:
                cases[individual.state.value] += 1

        return cases

    """Prints the simulation report to the console."""
    def printReport(self, report):
        for cases in report:
            print(cases, '\t', end=' ')
        print()

    """
    Logs column headers representing states if verbose mode is enabled.
    
    Args:
        verbose (bool): Whether to print the headers.
    """
    def logHeaders(self, verbose):
        if (verbose):
            states = list(State)

            for state in states:
                print(state, '\t', end = ' ')

            print()
	
    """
    Logs the simulation's current state counts if verbose mode is enabled.

    Args:
        verbose (bool): Whether to print the report.
    """
    def logReport(self, verbose):
        if (verbose):
            report = self.report()
            self.printReport(report)
	
    """
        Runs the simulation for the specified number of generations, 
        logging results if verbose mode is enabled.
        
        Args:
            generations (int): The number of generations to simulate.
            verbose (bool): Whether to print detailed simulation logs.
        """
    def simulation(self, generations, verbose):
        self.logHeaders(verbose)

        self.logReport(verbose)

		#self.logPopulation(self.population)

        for i in range(generations):
            self.nextGeneration()
			#self.logPopulation(self.population)
            self.logReport(verbose)
			#if (i == generations):
			# model.printImage(i)
	
    """Counts the number of dead individuals in the population."""
    def numberOfDeaths(self):
        deaths = 0

        for row in self.population:
            for individual in row:
                if individual.state == State.dead:
                    deaths += 1
        return deaths
    
    """Prints the status of each individual in the population on the console, formatted in table form."""
    def logPopulation(self, population):
        for i in range(len(population)):
            for j in range(len(population)):
                print(population[i][j].state.value, '\t', end = ' ')
            print()
        print()

    """
        Creates and displays an image of the population after the end of the simulation.
    """
    def printImage(self, name):

        lines = len(self.population)
        columns = len(self.population[0])
        img = Image.new( mode = "RGB", size = (columns, lines))
            
        for i in range(lines):
            for j in range(columns):
                if (self.population[i][j].state == State.healthy):
                    img.putpixel((i, j), (0, 256, 0)) # green -> healthy
                elif (self.population[i][j].state == State.sick):
                    img.putpixel((i, j), (256, 256, 0)) # yellow -> sick
                elif (self.population[i][j].state == State.dead):
                    img.putpixel((i, j), (256, 0, 0)) # red -> dead
                elif (self.population[i][j].state == State.immune):
                    img.putpixel((i, j), (0, 0, 256)) # blue -> immune
                else:
                    print("INVALID STATE")

        img.save("gen" + str(name) + ".png")
        img.show()



# MAIN PROGRAM

if __name__ == "__main__":
    numberOfRuns = 10        # Number of simulation runs
    gridSize = 100            # Size of the population grid
    numberOfGenerations = 52     # Number of generations (iterations) per simulation run

    # Run the simulation multiple times and print the number of deaths after each run
    for i in range(numberOfRuns):
        model = RandomWalkModel(gridSize)
        model.simulation(numberOfGenerations, False)
        print(model.numberOfDeaths())
        #model.printImage(i)